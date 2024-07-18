// // app-routing.module.ts

// import { NgModule } from '@angular/core';
// import { Routes, RouterModule } from '@angular/router';
// import { LoginComponent } from './login/login.component';
// import { StockPriceComponent } from './stock-price/stock-price.component';
// import { AuthGuard } from './auth.guard';

// const routes: Routes = [
//   { path: 'login', component: LoginComponent },
//   { path: 'stock-price', component: StockPriceComponent, canActivate: [AuthGuard] },
//   { path: '', redirectTo: '/login', pathMatch: 'full' },
//   { path: '**', redirectTo: '/login' } // Handle any other routes
// ];


// @NgModule({
//   imports: [RouterModule.forRoot(routes)],
//   exports: [RouterModule]
// })
// export class AppRoutingModule { }
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { StockPriceComponent } from './stock-price/stock-price.component';
import { AuthGuard } from './auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'stock-price', component: StockPriceComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' } // Handle any other routes
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
