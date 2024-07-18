// // import { Injectable } from '@angular/core';
// // import { CanActivate, Router } from '@angular/router';
// // import { StockService } from './stock.service';

// // @Injectable({
// //   providedIn: 'root'
// // })
// // export class AuthGuard implements CanActivate {

// //   constructor(private stockService: StockService, private router: Router) {}

// //   canActivate(): boolean {
// //     if (this.stockService.isLoggedIn()) {
// //       return true; // User is authenticated, allow access
// //     } else {
// //       this.router.navigate(['/login']); // Redirect to login page if not authenticated
// //       return false;
// //     }
// //   }
// // }
// import { Injectable } from '@angular/core';
// import { CanActivate, Router } from '@angular/router';
// import { AuthService } from './auth.service';

// @Injectable({
//   providedIn: 'root'
// })
// export class AuthGuard implements CanActivate {

//   constructor(private authService: AuthService, private router: Router) {}

//   canActivate(): boolean {
//     if (this.authService.isAuthenticated()) {
//       return true; // User is authenticated, allow access
//     } else {
//       this.router.navigate(['/login']); // Redirect to login page if not authenticated
//       return false;
//     }
//   }
// }
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { StockService } from './stock.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private stockService: StockService, private router: Router) {}

  canActivate(): boolean {
    const isLoggedIn = this.stockService.getToken() !== null;
    if (!isLoggedIn) {
      this.router.navigate(['/login']);
    }
    return isLoggedIn;
  }
}

