import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { StockPriceComponent } from './stock-price/stock-price.component';
import { AuthGuard } from './auth.guard';
import { AppComponent } from './app.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'stock-price', component: StockPriceComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' } // Handle any other routes
];
