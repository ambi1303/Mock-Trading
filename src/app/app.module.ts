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

@NgModule({
  declarations: [],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule, AppComponent,
    LoginComponent,
    StockPriceComponent,

  ],
  providers: [AuthService, AuthGuard, provideHttpClient(withFetch())],
  bootstrap: []
})
export class AppModule { }
