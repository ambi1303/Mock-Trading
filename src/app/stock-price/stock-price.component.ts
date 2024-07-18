import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { StockService } from '../stock.service';
import { Observable, Subscription, interval } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Portfolio, StockPurchase, Transaction } from '../portfolio.model';


@Component({
  selector: 'app-stock-price',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    currentValue:number,
    invested:number,
    totalReturns:number,
    totalReturnsPercentage:string
  }> = [];

  transactions: Transaction[] = [];
  userIdentifier: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  private priceSubscription: Subscription | null = null;

  constructor(
    private stockService: StockService, 
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  portfolio$: Observable<Portfolio> | null = null;

  ngOnInit() {
    this.userIdentifier = localStorage.getItem('username') || '';
    this.fetchStockPrices();
    this.updatePortfolio();
    this.portfolio$ = this.stockService.getUserPortfolio();
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
          console.error('Error fetching stock prices:', error);
          this.errorMessage = 'Failed to fetch stock prices';
        }
      );
  }

  buyStock(symbol: string, quantity: number) {
    this.stockService.buyStock(symbol, quantity).subscribe(
      (response: Portfolio) => {
        console.log('Stock bought:', response);
        this.portfolio = response;
        this.transactions = response.transactions;
        this.updatePortfolioItems();
        this.successMessage = `Successfully bought ${quantity} shares of ${symbol}`;
        this.cdr.detectChanges();
      },
      error => {
        console.error('Error buying stock:', error);
        this.errorMessage = 'Failed to buy stock: ' + (error.error?.message || error.message);
      }
    );
  }

  sellStock(symbol: string, quantity: number) {
    this.stockService.sellStock(symbol, quantity).subscribe(
      (response: Portfolio) => {
        console.log('Stock sold:', response);
        this.portfolio = response;
        this.transactions = response.transactions;
        this.updatePortfolioItems();
        this.successMessage = `Successfully sold ${quantity} shares of ${symbol}`;
        this.cdr.detectChanges();
      },
      error => {
        console.error('Error selling stock:', error);
        this.errorMessage = 'Failed to sell stock: ' + (error.error?.message || error.message);
      }
    );
  }

  updatePortfolio() {
    this.stockService.getUserPortfolio().subscribe(
      (portfolio: Portfolio) => {
        console.log('Fetched portfolio:', portfolio);
        console.log('Cash Value:',portfolio.cash);
        this.portfolio = portfolio;
        this.transactions = Array.isArray(portfolio.transactions)? portfolio.transactions:[];
        this.updatePortfolioItems();
        this.cdr.detectChanges();
      },
      error => {
        console.error('Error fetching portfolio:', error);
        this.errorMessage = 'Failed to fetch portfolio';
      }
    );
  }

  updatePortfolioItems() {
    console.log('Updating portfolio items', this.portfolio);
    this.portfolioItems = Object.keys(this.portfolio.stocks || {}).map(symbol => {
      const purchases: StockPurchase[] = this.portfolio.stock_purchases[symbol] || [];
      if (!Array.isArray(purchases)) {
        console.error(`Purchases for ${symbol} is not an array:`, purchases);
        return {
          symbol,
          quantity: this.portfolio.stocks[symbol] || 0,
          avgPrice: 0,
          currentPrice: this.stockPrices[symbol] || 0,
          invested: 0,
          currentValue: 0,
          totalReturns: 0,
          totalReturnsPercentage: '0.00'
        };
      }
      const totalQuantity = purchases.reduce((sum: number, purchase: StockPurchase) => sum + purchase.quantity, 0);
      const totalCost = purchases.reduce((sum: number, purchase: StockPurchase) => sum + purchase.quantity * purchase.price, 0);
      const avgPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;
      const currentPrice = this.stockPrices[symbol] || 0;
      const currentValue = currentPrice * totalQuantity;
      const totalReturns = currentValue - totalCost;
      const totalReturnsPercentage = totalCost > 0 ? (totalReturns / totalCost) * 100 : 0;
      return {
        symbol,
        quantity: totalQuantity,
        avgPrice: avgPrice,
        currentPrice: currentPrice,
        invested: totalCost,
        currentValue: currentValue,
        totalReturns: totalReturns,
        totalReturnsPercentage: totalReturnsPercentage.toFixed(2)
      };
    }).filter(item => item.quantity > 0);
    console.log('Updated portfolio items', this.portfolioItems);
  }
  get cashBalance():number{
    return this.portfolio.cash || 0;
  }
  calculateTotalInvested():number{
    return this.portfolioItems.reduce((total, item) => total + item.invested, 0);
  }

  calculateTotalPortfolioValue(): number {
    return  this.portfolioItems.reduce((total: number, item: any) => 
      total + (item.quantity * (this.stockPrices[item.symbol] || 0)), 0);
  }
  calculateTotalReturns(): number {
    return this.calculateTotalPortfolioValue() - this.calculateTotalInvested();
  }
  calculateTotalReturnsPercentage(): string {
    const totalInvested = this.calculateTotalInvested();
    const totalReturns = this.calculateTotalReturns();
    return ((totalReturns / totalInvested) * 100).toFixed(2);
  }

  calculateStockValue(item: any): number {
    return item.quantity * this.stockPrices[item.symbol];
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }

  initializeUserData() {
    this.stockService.getUserData().pipe(take(1)).subscribe(
      userData => {
        this.portfolio = userData.portfolio;
        this.transactions = userData.transactions;
        this.updatePortfolioItems();
        this.fetchStockPrices();
        this.cdr.detectChanges();
      },
      error => {
        console.error('Error fetching portfolio:', error);
        this.errorMessage = 'Failed to fetch user data';
      }
    );
  }

  logout() {
    this.stockService.logout();
    this.router.navigate(['/login']);
  }
}