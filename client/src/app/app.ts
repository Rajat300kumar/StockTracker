import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoaderService } from './service/loader';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet,CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('client');
  isLoading: typeof this.loaderService.isLoading$;

  constructor(private loaderService: LoaderService) {
    this.isLoading = this.loaderService.isLoading$;
  }
}
