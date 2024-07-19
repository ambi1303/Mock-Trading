import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient,withFetch } from '@angular/common/http';
import { routes } from './app.routes';
import { HttpClient } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }),AppRoutingModule, provideRouter(routes),provideHttpClient(withFetch()),HttpClient, provideAnimationsAsync()

  ]
};
