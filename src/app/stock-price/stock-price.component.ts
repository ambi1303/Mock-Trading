import { Component, OnInit, OnDestroy } from '@angular/core';
import { StockService } from '../stock.service';
import { Observable, Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  portfolio: any = { cash: 0, stocks: {}, avgPrices: {} };
  portfolioItems: any[] = [];
  transactions: any[] = [];
  userIdentifier: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  private priceSubscription: Subscription | null = null;

  constructor(private stockService: StockService, private router: Router) {}

  portfolio$: Observable<any> | null = null;

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
        },
        error => {
          console.error('Error fetching stock prices:', error);
          this.errorMessage = 'Failed to fetch stock prices';
        }
      );
  }

  buyStock(symbol: string, quantity: number) {
    this.stockService.buyStock(symbol, quantity).subscribe(
      response => {
        console.log('Stock bought:', response);
        this.portfolio = {
          cash: response.balance,
          stocks: response.stocks,
          avgPrices: response.avgPrices
        };
        this.updatePortfolioItems();
        this.successMessage = `Successfully bought ${quantity} shares of ${symbol}`;
      },
      error => {
        console.error('Error buying stock:', error);
        this.errorMessage = 'Failed to buy stock: ' + (error.error?.message || error.message);
      }
    );
  }

  sellStock(symbol: string, quantity: number) {
    this.stockService.sellStock(symbol, quantity).subscribe(
      response => {
        console.log('Stock sold:', response);
        this.portfolio = {
          cash: response.balance,
          stocks: response.stocks,
          avgPrices: response.avgPrices
        };
        this.updatePortfolioItems();
        this.successMessage = `Successfully sold ${quantity} shares of ${symbol}`;
      },
      error => {
        console.error('Error selling stock:', error);
        this.errorMessage = 'Failed to sell stock: ' + (error.error?.message || error.message);
      }
    );
  }

  updatePortfolio() {
    this.stockService.getUserPortfolio().subscribe(
      portfolio => {
        this.portfolio = portfolio;
        this.updatePortfolioItems();
        this.transactions = Array.isArray(this.portfolio.transactions) ? this.portfolio.transactions : [];
      },
      error => {
        console.error('Error fetching portfolio:', error);
        this.errorMessage = 'Failed to fetch portfolio';
      }
    );
  }

  updatePortfolioItems() {
    this.portfolioItems = Object.keys(this.portfolio.stocks || {}).map(symbol => ({
      symbol,
      quantity: this.portfolio.stocks[symbol] || 0,
      avgPrice: this.portfolio.avgPrices[symbol] || 0,
      currentPrice: this.stockPrices[symbol] || 0
    })).filter(item => item.quantity > 0);
  }
  calculateTotalPortfolioValue(): number {
    const stocksValue = this.portfolioItems.reduce((total, item) => 
      total + (item.quantity * (this.stockPrices[item.symbol] || 0)), 0);
    return (this.portfolio.cash || 0) + stocksValue;
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
}