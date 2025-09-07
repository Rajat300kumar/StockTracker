// stock-navigation.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class StockNavigationService {
  private stockSelectedSource = new Subject<string>();
  stockSelected$ = this.stockSelectedSource.asObservable();

  selectStock(symbol: string) {
    this.stockSelectedSource.next(symbol);
  }
}
