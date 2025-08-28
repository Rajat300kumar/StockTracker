import { ChangeDetectorRef, Component, inject, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Post } from '../../service/post';
import { MatTab, MatTabChangeEvent } from '@angular/material/tabs';
import { MatTabGroup } from '@angular/material/tabs';

import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTable } from '@angular/material/table';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { LoaderService } from '../../service/loader';
export interface overview {
  region: string,
  count: number,
  action: string
}
@Component({
  selector: 'app-overview',
  imports: [MatTab, MatTabGroup, MatTable, MatTableModule, CommonModule, MatIcon],
  templateUrl: './overview.html',
  styleUrl: './overview.css'
})
export class Overview implements OnChanges {
  @Input() config!: overview
  loader = inject(LoaderService)

  constructor(private postService: Post, private cdref: ChangeDetectorRef) { }
  @Input() quotes: any[] = [];
  selectedTabIndex: number = 0;
  displayedColumns: string[] = ['slNo', 'symbol', 'name', 'price', 'high', 'low', 'change', 'exchange'];

  dataSource = new MatTableDataSource<any>([]);

  tabsList = ['day_gainers',
    'day_losers',
    'most_actives',
    'undervalued_growth_stocks',
    'aggressive_small_caps',
    'undervalued_large_caps',];

  onTabChange(index: number) {
    console.log(index)
    this.selectedTabIndex = index
    const action = this.tabsList[index];
    this.config.action = action;
    this.marketoverview(this.config)
  }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      console.log(this.config)
      this.onTabChange(0)
      // this.marketoverview(this.config)
    }
  }
  marketoverview(config: object) {
    console.log(config)
    this.loader.show()
    var pd = { region: this.config.region, count: this.config.count, action: this.config.action }
    console.log(pd)
    this.postService.marketviewpost(pd).subscribe({
      next: ((res: any) => {
        this.loader.hide()
        console.log(res['data'])
        this.dataSource = res.data?.quotes
        console.log('DataSource:', this.dataSource);

        //  this.dataSource.data = res.data?.quotes || [];
        this.cdref.detectChanges();

      }),
      error: (err => {
        this.loader.hide()
        console.log(err)
      })
    })
  }
  getColumnValue(stock: any, column: string): any {
    switch (column) {
      case 'symbol':
        return stock.symbol;
      case 'name':
        return stock.longName || '-';
      case 'price':
        return `₹${stock.regularMarketPrice?.toFixed(2) || '-'}`;
      case 'high':
        return `₹${stock.regularMarketDayHigh || '-'}`;
      case 'low':
        return `₹${stock.regularMarketDayLow || '-'}`;
      case 'change':
        const percent = stock.regularMarketChangePercent ?? 0;
        return {
          percent: percent.toFixed(2),
          icon: percent >= 0 ? 'arrow_upward' : 'arrow_downward',
          colorClass: percent >= 0 ? 'positive' : 'negative',
        };
      default:
        return stock[column] || '-';
    }
  }
  // Optional: for formatting tab labels
  formatLabel(label: string): string {
    return label.replace(/_/g, ' ').toUpperCase();
  }
}
