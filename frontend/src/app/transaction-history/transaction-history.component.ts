import { Component } from '@angular/core';
import { StockService } from '../stock.service';
import { Portfolio, Transaction } from '../portfolio.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-transaction-history',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './transaction-history.component.html',
  styleUrl: './transaction-history.component.css'
})
export class TransactionHistoryComponent {
  transactions:Transaction[]=[];
  constructor(private stockService:StockService){}

  ngOnInit(){
    this.fetchTransactions();
  }

  fetchTransactions(){
    this.stockService.getUserPortfolio().subscribe(
      (portfolio:Portfolio)=>{
        this.transactions=portfolio.transactions;
      },
      error=>{
        console.error('Error Fetching transactions:',error);
      }
    )
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }

}
