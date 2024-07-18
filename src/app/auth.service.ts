import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenSubject: BehaviorSubject<string | null>;

  constructor(private http: HttpClient, private router: Router) {
    this.tokenSubject = new BehaviorSubject<string | null>(localStorage.getItem('token'));
  }

  get token(): string | null {
    return this.tokenSubject.value;
  }

  register(userData: any): Observable<any> {
    return this.http.post('/api/register', userData);
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post<{ access_token: string }>('/api/login', { email, password }).pipe(
      tap(response => {
        localStorage.setItem('token', response.access_token);
        this.tokenSubject.next(response.access_token);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    this.tokenSubject.next(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}
