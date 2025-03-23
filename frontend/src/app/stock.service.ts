import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class StockService {
  private apiUrl = 'http://localhost:8000/api';  // Adjust as needed
  private tokenKey = 'access_token';

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  buyStock(symbol: string, quantity: number): Observable<any> {
    const url = `${this.apiUrl}/buy`;
    const body = { symbol, quantity };
    console.log('Sell request payload:',body);
    return this.http.post<any>(url, body, { headers: this.getAuthHeaders() });
  }

  sellStock(symbol: string, quantity: number): Observable<any> {
    const url = `${this.apiUrl}/sell`;
    const body = { symbol, quantity };
    console.log('Sell request payload:', body);
    return this.http.post<any>(url, body, { headers: this.getAuthHeaders() });
  }

  getStockPrices(): Observable<{prices: {[key: string]: number}, timestamp: number}> {
    const url = `${this.apiUrl}/stock_prices`;
    return this.http.get<{prices: {[key: string]: number}, timestamp: number}>(url).pipe(
      catchError(this.handleError<{prices: {[key: string]: number}, timestamp: number}>('getStockPrices'))
    );
  }

  getUserPortfolio(): Observable<any> {
    const token=localStorage.getItem('access_token')
    const url = `${this.apiUrl}/portfolio`;
    return this.http.get<any>(url, { headers: this.getAuthHeaders() });
  }

  getSpecificUserPortfolio(userId: string): Observable<any> {
    const url = `${this.apiUrl}/portfolio/${userId}`;
    return this.http.get<any>(url);
  }

  login(email: string, password: string): Observable<any> {
    const url = `${this.apiUrl}/login`;
    const body = { email, password };
    return this.http.post<any>(url, body).pipe(
      map(response => {
        if (response && response.access_token) {
          localStorage.setItem(this.tokenKey, response.access_token);
          return response;
        }
        throw new Error('Invalid response structure');
      }),
      catchError(this.handleError<any>('login'))
    );
  }

  register(username: string, email: string, password: string): Observable<any> {
    const url = `${this.apiUrl}/register`;
    const body = { username, email, password };
    return this.http.post<any>(url, body).pipe(
      map(response => {
        if (response && response.access_token) {
          localStorage.setItem(this.tokenKey, response.access_token);
          return response;
        }
        throw new Error('Invalid response structure');
      }),
      catchError(this.handleError<any>('register'))
    );
  }

  autoLogin(): Observable<boolean> {
    const token = this.getToken();
    return of(!!token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      return throwError(error);
    };
  }

  getCurrentTimestamp():Observable<number>{
    const url=`${this.apiUrl}/current_timestamp`;
    return this.http.get<{timestamp:number}>(url).pipe(
      map(response=>response.timestamp),
      catchError(this.handleError<number>('getCurrentTimestamp'))
    );
  }
  getUserData():Observable<any>{
    return this.http.get<any>(`${this.apiUrl}/portfolio`);
  }
}
