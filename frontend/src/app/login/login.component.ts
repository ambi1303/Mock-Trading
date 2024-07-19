//login-component.ts
import { Component } from '@angular/core';
import { StockService } from '../stock.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockPriceComponent } from "../stock-price/stock-price.component";

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, StockPriceComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username: string = '';
  email: string = '';
  password: string = '';
  errorMessage: string = '';
  isRegisterMode: boolean = false;
  usernameOrEmail: string='';

  constructor(private stockService: StockService, private router: Router) {}

  toggleMode() {
    this.isRegisterMode = !this.isRegisterMode;
    this.errorMessage = '';
  }

  processAuth() {
    if (this.isRegisterMode) {
      this.register();
    } else {
      this.login();
    }
  }

  login() {
    this.stockService.login(this.email, this.password).subscribe({
      next: (response) => {
        console.log('Login successful:', response);
        console.log('Token:', localStorage.getItem('access_token'));
        localStorage.setItem('usernameOrEmail',this.usernameOrEmail);
        this.router.navigate(['/stock-price']); // Adjust the route as needed
      },
      error: (err) => {
        console.error('Login error:', err);
        this.errorMessage = 'Invalid credentials. Please try again.';
      }
    });
  }

  register() {
    this.stockService.register(this.username, this.email, this.password).subscribe({
      next: (response) => {
        console.log('Registration successful:', response);
        if (response && response.access_token) {
          console.log('Token:', response.access_token);
          localStorage.setItem('access_token', response.access_token);
          this.router.navigate(['/stock-price']);
        } else {
          console.error('No access token in response');
          this.errorMessage = 'Registration successful, but login failed. Please try logging in.';
        }
      },
      error: (err) => {
        console.error('Registration error:', err);
        this.errorMessage = 'Registration failed. Please try again.';
      }
    });
  }
}
