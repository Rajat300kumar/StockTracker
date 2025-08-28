import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexPlotOptions,
  ApexStroke,
  ApexFill,
  ApexNonAxisChartSeries,
  ApexOptions,
  NgApexchartsModule
} from 'ng-apexcharts';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { Post } from '../../service/post';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';     // ✅ REQUIRED
import { MatSortModule } from '@angular/material/sort';
import { LoaderService } from '../../service/loader';
export interface StockConfig {
  symbols: string[];
  range: string;
  reportType: string;
  metrics: string[];
  chartType: string;
}


export interface StockMeta {
  symbol: string;
  range: string;
  interval: string;
  period1: string;
  period2: string;
  data: StockData[];
}

export interface StockData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}




@Component({
  selector: 'app-stock-chart',
  imports: [CommonModule, NgApexchartsModule, FormsModule, MatTabsModule, MatTableModule, MatSortModule],
  templateUrl: './stock-chart.html',
  styleUrls: ['./stock-chart.css']  // fixed here
})
export class StockChart implements OnChanges {
  loader = inject(LoaderService)
  @Input() config!: StockConfig;
  percentageChange: number | null = null;

  chartOptions: Partial<ApexOptions> = {};
  chartType: string = 'candlestick'; // default
  marketCloseDate = new Date(); // Replace later with actual time from API if needed
  defaultChart: ApexChart = { type: 'line', height: 350 };
  defaultPlotOptions: ApexPlotOptions = {};
  defaultStroke: ApexStroke = {};
  intervals: string[] = ['1 D', '5 D', '1 M', '6 M', 'YTD', '1 Y', '5 Y', 'MAX'];
  selectedInterval: string = '6 M'; // Default interval
  matrics: string = 'open'
  stockData: any;
  currentPrice = 189.23;
  currency = 'INR';

  dataSource = new MatTableDataSource<StockData>();
  displayedColumns: string[] = ['date', 'open', 'high', 'low', 'close', 'volume'];

  @ViewChild(MatSort) sort!: MatSort;
  lastUpdated = new Date();
  symbol: any;

  constructor(private postService: Post, private cdref: ChangeDetectorRef) { }
  chartVisible = false;

  getExchangeFromSymbol(symbol: string): string {
    if (symbol.endsWith('.NS')) return 'NSE (India)';
    if (symbol.endsWith('.TO')) return 'TSX (Canada)';
    if (symbol.endsWith('.L')) return 'LSE (UK)';
    if (symbol.endsWith('.T')) return 'TSE (Japan)';
    return 'NYSE / NASDAQ (US)';
  }

  onTabChange(event: MatTabChangeEvent) {
    if (event.tab.textLabel === 'Chart') {
      // Delay slightly to allow DOM rendering
      setTimeout(() => {
        this.chartVisible = false; // destroy chart
        this.chartVisible = true;  // re-render chart
      }, 100);
    }
  }
  onIntervalChange(interval: any) {
    this.selectedInterval = interval
    // TODO: Fetch or filter chart data by interval
    console.log('Interval changed:', this.selectedInterval);
    this.getreportdata(this.config)
    // Example: you could call your data filtering logic here
  }

  getreportdata(item: any) {
    console.log(item)
    this.loader.show()
    var pd = { 'symbol': item.symbols, "range": this.selectedInterval, "reportType": item.reportType }
    console.log("pd", pd)
    // this.getExchangeFromSymbol(item.symbols)
    this.postService.report(pd).subscribe({
      next: (res: any) => {
        if (res['message'] == 'Done') {
          this.loader.hide()

          console.log(res)
          this.stockData = res.data[0];
          this.symbol = res.data[0].symbol;
          this.currentPrice = res.data[0].currentPrice;
          this.currency = res.data[0].currency
          // this.lastUpdated = new Date(res.data[0].lastUpdated);

          this.dataSource = this.stockData?.data
          this.onChartTypeChange()
          this.getExchangeFromSymbol(res.data[0].symbol)

          this.cdref.detectChanges()
        }
      },
      error: (error) => {
        this.loader.hide()
        console.log(error)
      }
    })
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      console.log(this.config)
      this.getreportdata(this.config)
    }
  }

  onChartTypeChange() {
    this.updateChart()
    this.cdref.detectChanges()
  }
  updateChart() {
    const data = this.stockData.data;
    const xValues = data.map((d: { date: string | number | Date; }) => new Date(d.date).toLocaleDateString());

    switch (this.chartType) {
      case 'candlestick':
        this.chartOptions = {
          series: [{
            data: data.map((d: { date: string | number | Date; open: number; high: number; low: number; close: number; }) => ({
              x: new Date(d.date),
              y: [
                parseFloat(d.open.toFixed(2)),
                parseFloat(d.high.toFixed(2)),
                parseFloat(d.low.toFixed(2)),
                parseFloat(d.close.toFixed(2))
              ]
            }))
          }],
          chart: { type: 'candlestick', height: 350 },
          xaxis: { type: 'datetime' },
          tooltip: {
            y: {
              formatter: (val) => `$${val.toFixed(2)}`
            }
          }
        };
        break;

      case 'line':
        this.chartOptions = {
          series: [{
            name: 'Close Price',
            data: data.map((d: { close: number; }) => parseFloat(d.close.toFixed(2)))
          }],
          chart: { type: 'line', height: 350 },
          xaxis: { categories: xValues },
          tooltip: {
            y: {
              formatter: (val) => `$${val.toFixed(2)}`
            }
          }
        };
        break;

      case 'bar':
        this.chartOptions = {
          series: [{
            name: 'Volume',
            data: data.map((d: { volume: number; }) => parseFloat((d.volume / 1_000_000).toFixed(1))) // in millions
          }],
          chart: { type: 'bar', height: 350 },
          xaxis: { categories: xValues },
          tooltip: {
            y: {
              formatter: (val) => `${val}M`
            }
          }
        };
        break;

      case 'donut':
        this.chartOptions = {
          series: data.map((d: { close: number; }) => parseFloat(d.close.toFixed(2))),
          chart: { type: 'donut', height: 350 },
          labels: data.map((d: { date: string | number | Date; }) => new Date(d.date).toLocaleDateString()),
          tooltip: {
            y: {
              formatter: (val) => `$${val.toFixed(2)}`
            }
          }
        };
        break;

      default:
        this.chartOptions = {};
    }
  }





}

