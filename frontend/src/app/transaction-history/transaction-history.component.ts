import { Component, OnInit } from '@angular/core';
import { StockService } from '../stock.service';
import { Portfolio, Transaction } from '../portfolio.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-transaction-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transaction-history.component.html',
  styleUrl: './transaction-history.component.css'
})
export class TransactionHistoryComponent implements OnInit {
  transactions: Transaction[] = [];

  constructor(private stockService: StockService) {}

  ngOnInit() {
    this.fetchTransactions();
  }

  fetchTransactions() {
    this.stockService.getUserPortfolio().subscribe(
      (portfolio: Portfolio) => {
        // Check if transactions is a string and parse it if necessary
        if (typeof portfolio.transactions === 'string') {
          try {
            this.transactions = JSON.parse(portfolio.transactions);
          } catch (error) {
            console.error('Error parsing transactions:', error);
            this.transactions = [];
          }
        } else {
          this.transactions = portfolio.transactions || [];
        }
        console.log('Parsed transactions:', this.transactions);
      },
      error => {
        console.error('Error Fetching transactions:', error);
      }
    );
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }
}