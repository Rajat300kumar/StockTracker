import { Component, Input } from '@angular/core';
import { StockNavigationService } from '../ag-grid/stock-navigation.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDivider } from '@angular/material/divider';

@Component({
  selector: 'app-cell-menu',
  imports: [MatButtonModule, MatMenuModule, MatIconModule,MatDivider],
  templateUrl: './cell-menu.html',
  styleUrl: './cell-menu.css'
})
export class CellMenu {
  @Input() params: any;

  symbol!: string;

  constructor(private stockNavigationService: StockNavigationService) { }

  agInit(params: any): void {
    this.params = params;
    this.symbol = params.data?.SYMBOL || params.data?.symbol;
  }

  refresh(params: any): boolean {
    return true;
  }

  onSelect(submenu: string, parentMenu: string) {
    this.stockNavigationService.selectStock(this.symbol, submenu, parentMenu);
  }
}
