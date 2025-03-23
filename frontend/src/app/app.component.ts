import { Component, OnInit } from '@angular/core';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockPriceComponent } from './stock-price/stock-price.component';
import { LoginComponent } from './login/login.component';
import { StockService } from './stock.service';
import { TransactionHistoryComponent } from './transaction-history/transaction-history.component';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule, StockPriceComponent,LoginComponent,TransactionHistoryComponent,RouterModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title:string="TRADING APP";
  constructor(private router:Router, private stockService:StockService){}
    ngOnInit() {
      this.stockService.autoLogin().subscribe(authenticated => {
        if (authenticated) {
          this.router.navigate(['/stock-price']); // Redirect to stock-price if authenticated
        } else {
          this.router.navigate(['/login']); // Redirect to login if not authenticated
        }
      });
    }

  
}