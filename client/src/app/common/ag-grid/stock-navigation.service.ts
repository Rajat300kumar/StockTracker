// stock-navigation.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
interface StockNavigationEvent {
  symbol: string;
  targetSubmenu: string;
  parentMenu: string;
}
@Injectable({ providedIn: 'root' })
export class StockNavigationService {
  private stockSelectedSource = new Subject<StockNavigationEvent>();
  stockSelected$ = this.stockSelectedSource.asObservable();

  selectStock(symbol: string, targetSubmenu: string, parentMenu: string) {
    this.stockSelectedSource.next({ symbol, targetSubmenu, parentMenu });
  }
}

