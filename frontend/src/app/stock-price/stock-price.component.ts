import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { StockService } from '../stock.service';
import { Observable, Subscription, interval } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Portfolio, StockPurchase, Transaction } from '../portfolio.model';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';  
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TransactionHistoryComponent } from '../transaction-history/transaction-history.component';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-stock-price',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatDialogModule, 
    MatSnackBarModule, 
    MatButtonModule,
    TransactionHistoryComponent
  ],
  templateUrl: './stock-price.component.html',
  styleUrls: ['./stock-price.component.css']
})
export class StockPriceComponent implements OnInit, OnDestroy {
  stockPrices: {[key: string]: number} = {};
  stockKeys: string[] = [];
  timestamp: number = 0;
  portfolio: Portfolio = { cash: 0, stocks: {}, stock_purchases: {}, transactions: [] };
  portfolioItems: Array<{
    symbol: string,
    quantity: number,
    avgPrice: number,
    currentPrice: number,
    currentValue: number,
    invested: number,
    totalReturns: number,
    totalReturnsPercentage: string
  }> = [];
  cashBalance: number = 0;
  transactions: Transaction[] = [];
  userIdentifier: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  private priceSubscription: Subscription | null = null;

  constructor(
    private stockService: StockService, 
    private router: Router,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.userIdentifier = localStorage.getItem('username') || '';
    this.fetchStockPrices();
    this.updatePortfolio();
  }

  ngOnDestroy() {
    if (this.priceSubscription) {
      this.priceSubscription.unsubscribe();
    }
  }

  fetchStockPrices() {
    this.priceSubscription = interval(15000)
      .pipe(
        switchMap(() => this.stockService.getStockPrices())
      )
      .subscribe(
        (data) => {
          this.stockPrices = data.prices;
          this.timestamp = data.timestamp;
          this.stockKeys = Object.keys(this.stockPrices);
          this.updatePortfolioItems();
          this.cdr.detectChanges();
        },
        error => {
          this.errorMessage = 'Failed to fetch stock prices';
          this.openSnackbar(this.errorMessage, 'Close');
        }
      );
  }

  buyStock(symbol: string, quantity: number) {
    this.stockService.buyStock(symbol, quantity).subscribe(
      (response: Portfolio) => {
        this.portfolio = response;
        this.transactions = response.transactions;
        this.updatePortfolioItems();
        this.successMessage = `Successfully bought ${quantity} shares of ${symbol}`;
        this.openSnackbar(this.successMessage, 'Close');
        this.cdr.detectChanges();
      },
      error => {
        this.errorMessage = 'Failed to buy stock: ' + (error.error?.message || error.message);
        this.openSnackbar(this.errorMessage, 'Close');
      }
    );
  }

  sellStock(symbol: string, quantity: number) {
    this.stockService.sellStock(symbol, quantity).subscribe(
      (response: Portfolio) => {
        this.portfolio = response;
        this.transactions = response.transactions;
        this.updatePortfolioItems();
        this.successMessage = `Successfully sold ${quantity} shares of ${symbol}`;
        this.openSnackbar(this.successMessage, 'Close');
        this.cdr.detectChanges();
      },
      error => {
        this.errorMessage = 'Failed to sell stock: ' + (error.error?.message || error.message);
        this.openSnackbar(this.errorMessage, 'Close');
      }
    );
  }

  updatePortfolio() {
    this.stockService.getUserPortfolio().subscribe(
      (portfolio: Portfolio) => {
        this.portfolio = portfolio;
        this.cashBalance = portfolio.cash;
        this.transactions = Array.isArray(portfolio.transactions) ? portfolio.transactions : [];
        this.updatePortfolioItems();
        this.cdr.detectChanges();
      },
      error => {
        this.errorMessage = 'Failed to fetch portfolio';
        this.openSnackbar(this.errorMessage, 'Close');
      }
    );
  }

  updatePortfolioItems() {
    this.portfolioItems = Object.keys(this.portfolio.stocks || {}).map(symbol => {
      let purchases = this.portfolio.stock_purchases[symbol];
      
      // Convert purchases to an array if it's not already one
      if (!Array.isArray(purchases)) {
        purchases = purchases ? [purchases] : [];
      }
  
      const totalQuantity = purchases.reduce((sum, purchase) => sum + (purchase.quantity || 0), 0);
      const totalCost = purchases.reduce((sum, purchase) => sum + ((purchase.quantity || 0) * (purchase.price || 0)), 0);
      const avgPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;
      const currentPrice = this.stockPrices[symbol] || 0;
      const currentValue = currentPrice * totalQuantity;
      const totalReturns = currentValue - totalCost;
      const totalReturnsPercentage = totalCost > 0 ? (totalReturns / totalCost) * 100 : 0;
  
      return {
        symbol,
        quantity: totalQuantity,
        avgPrice,
        currentPrice,
        invested: totalCost,
        currentValue,
        totalReturns,
        totalReturnsPercentage: totalReturnsPercentage.toFixed(2)
      };
    }).filter(item => item.quantity > 0);
  
    this.cashBalance = this.portfolio.cash || 0;
    this.cdr.detectChanges(); // Trigger change detection
  }
  calculateTotalInvested(): number {
    return this.portfolioItems.reduce((total, item) => total + item.invested, 0);
  }

  calculateTotalPortfolioValue(): number {
    return this.portfolioItems.reduce((total, item) => 
      total + (item.quantity * (this.stockPrices[item.symbol] || 0)), 0);
  }

  calculateTotalReturns(): number {
    return this.calculateTotalPortfolioValue() - this.calculateTotalInvested();
  }

  calculateTotalReturnsPercentage(): string {
    const totalInvested = this.calculateTotalInvested();
    const totalReturns = this.calculateTotalReturns();
    return totalInvested > 0 ? ((totalReturns / totalInvested) * 100).toFixed(2) : '0.00';
  }

  calculateStockValue(item: any): number {
    return item.quantity * this.stockPrices[item.symbol];
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }

  logout() {
    this.stockService.logout();
    this.router.navigate(['/login']);
  }

  openTransactionHistory(): void {
    const dialogRef = this.dialog.open(TransactionHistoryComponent, {
      width: '600px',
      data: { transactions: this.transactions }
    });

    dialogRef.afterClosed().subscribe(() => {
      this.updatePortfolio();
    });
  }

  openSnackbar(message: string, action: string) {
    this.snackBar.open(message, action, {
      duration: 2000
    });
  }
}