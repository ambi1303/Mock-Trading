import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule, provideHttpClient, withFetch } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { LoginComponent } from './login/login.component';
import { StockPriceComponent } from './stock-price/stock-price.component';
import { AppRoutingModule } from './app-routing.module';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';


@NgModule({
  declarations: [],
  imports: [
    BrowserModule,
    AppRoutingModule,RouterModule,
    FormsModule,
    HttpClientModule, AppComponent,
    LoginComponent,
    StockPriceComponent,MatDialogModule,MatSnackBarModule,MatButtonModule

  ],
  providers: [AuthService, AuthGuard, provideHttpClient(withFetch())],
  bootstrap: []
})
export class AppModule { }
