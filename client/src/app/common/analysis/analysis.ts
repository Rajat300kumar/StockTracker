import { ChangeDetectorRef, Component, inject, Input, input, OnChanges, SimpleChanges } from '@angular/core';
import { Post } from '../../service/post';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { FormsModule } from '@angular/forms';
import { MatSortModule } from '@angular/material/sort';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../../service/loader';
import { NumberSuffixPipe } from '../../number-suffix-pipe';
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
export interface AnalysisConfig {
  symbols: string[];
  range: string;
  reportType: "price" | "volume" | "technical";
  movingAverages: {
    SMA?: number[];
    EMA?: number[];
    RSI?: number[];
    MACD?: { fast: number; slow: number; signal: number }[];
  };
}
interface CombinedRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change?: string; // like 🔻 -0.66%
  trend?: 'up' | 'down' | 'neutral';
  // Optional indicators
  [key: string]: any;
}


@Component({
  selector: 'app-analysis',
  imports: [CommonModule, NgApexchartsModule, FormsModule, MatTabsModule, MatTableModule, MatSortModule, NumberSuffixPipe],
  templateUrl: './analysis.html',
  styleUrl: './analysis.css'
})
export class Analysis implements OnChanges {
  loader = inject(LoaderService)

  @Input() config!: AnalysisConfig;
  displayedColumns: string[] = ['date', 'open', 'high', 'low', 'close', 'volume',];
  intervals: string[] = ['1 D', '5 D', '1 M', '6 M', 'YTD', '1 Y', '5 Y', 'MAX'];
  selectedInterval: string = '1 D';
  chartVisible: boolean = false;
  relativeStrengthPeriod: number = 5;
  momentumScorePeriod: number = 5;

  historicalData: any[] = [];
  chartType: any = 'candlestick'; // default
  chartOptions: Partial<ApexOptions> = {};
  defaultPlotOptions: ApexPlotOptions = {};
  defaultStroke: ApexStroke = {};
  smaOptions = [7, 20, 50];
  emaOptions = [10, 20, 50, 100];
  rsiOptions = [7, 14, 21, 30];
  macdOptions = [
    { fast: 12, slow: 26, signal: 9 },
    { fast: 5, slow: 13, signal: 9 },
    { fast: 10, slow: 30, signal: 9 }
  ];

  selectedMACD: { fast: number; slow: number; signal: number }[] = [];

  selectedSMA: number[] = [];
  selectedEMA: number[] = [];
  selectedRSI: number[] = [];


  defaultChart: ApexChart = { type: 'line', height: 350 };
  stockSymbol = 'AAPL';
  currentPrice = '';
  currency = 'USD';
  symbol = '';
  lastUpdated = new Date();
  percentageChange: number | null = null;

  dataSource = new MatTableDataSource<any>();
  selectedReportType: string = 'price';
  constructor(private postService: Post, private cdref: ChangeDetectorRef) { }
  onCheckboxChange(event: Event, type: 'SMA' | 'EMA' | 'RSI') {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);

    const selectedArray = type === 'SMA' ? this.selectedSMA
      : type === 'EMA' ? this.selectedEMA
        : this.selectedRSI;

    if (input.checked) {
      selectedArray.push(value);
    } else {
      const index = selectedArray.indexOf(value);
      if (index > -1) selectedArray.splice(index, 1);
    }
    this.fetchUpdatedAnalysis();
  }

  onMacdChange(event: Event, macd: { fast: number; slow: number; signal: number }) {
    const input = event.target as HTMLInputElement;
    console.log(input)
    const key = (m: any) => `${m.fast}-${m.slow}-${m.signal}`;
    const exists = this.selectedMACD.some(m => key(m) === key(macd));

    if (input.checked && !exists) {
      this.selectedMACD.push(macd);
    } else if (!input.checked && exists) {
      this.selectedMACD = this.selectedMACD.filter(m => key(m) !== key(macd));
    }
    this.fetchUpdatedAnalysis();
  }

  isMacdSelected(macd: { fast: number; slow: number; signal: number }): boolean {
    const key = (m: any) => `${m.fast}-${m.slow}-${m.signal}`;
    return this.selectedMACD.some(m => key(m) === key(macd));
  }

  isNumber(value: any): boolean {
    return typeof value === 'number' && !isNaN(value);
  }



  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      console.log(this.config)
      this.selectedReportType = this.config.reportType as 'price' | 'volume' | 'technical'; // ✅ Valid string literal
      this.fetchUpdatedAnalysis();
      // this.getanaylisdata(this.config)
    }
  }
  onIntervalChange(interval: any) {
    this.selectedInterval = interval
    console.log(interval)
    this.config.range = this.selectedInterval.replace(/\s+/g, '');
    this.fetchUpdatedAnalysis();
    // this.getanaylisdata(this.config)
  }
  onTabChange(event: MatTabChangeEvent): void {
    if (event.tab.textLabel === 'Chart') {
      this.chartVisible = false;

      setTimeout(() => {
        this.updateChart();       // 👈 Call the chart setup function
        this.chartVisible = true;
        this.cdref.detectChanges();
      }, 50);
    }
  }


  getExchangeFromSymbol(symbol: string): string {
    if (symbol.endsWith('.NS')) return 'NSE (India)';
    if (symbol.endsWith('.TO')) return 'TSX (Canada)';
    if (symbol.endsWith('.L')) return 'LSE (UK)';
    if (symbol.endsWith('.T')) return 'TSE (Japan)';
    return 'NYSE / NASDAQ (US)';
  }

  fetchUpdatedAnalysis() {
    const config = {
      symbols: this.config.symbols,
      range: this.config.range,
      reportType: this.config.reportType as any,
      movingAverages: {
        SMA: this.selectedSMA,
        EMA: this.selectedEMA,
        RSI: this.selectedRSI,
        MACD: this.selectedMACD
      }
    };

    this.getanaylisdata(config);
  }

  calculateRelativeStrength(historical: any[], index: number, period: number): number | null {
    if (index < period || !historical[index]?.close) return null;

    const validData = historical.slice(index - period, index).filter(day => day?.close != null);
    if (validData.length < period) return null;

    const sum = validData.reduce((acc, day) => acc + day.close, 0);
    const avg = sum / period;

    const currentClose = historical[index].close;
    return +(currentClose / avg).toFixed(4); // rounded to 4 decimals
  }

  calculateMomentumScore(historical: any[], index: number, period: number): number | null {
    if (
      index < period ||
      !historical[index]?.close ||
      !historical[index - period]?.close
    ) {
      return null;
    }

    const currentClose = historical[index].close;
    const pastClose = historical[index - period].close;

    if (pastClose === 0) return null; // avoid divide by zero

    return +(((currentClose - pastClose) / pastClose) * 100).toFixed(2); // return in %
  }




  calculateStockPerformance(day: any): string {
    if (day.close > day.open) return 'Positive';
    if (day.close < day.open) return 'Negative';
    return 'Neutral';
  }

  calculateRSIDivergence_grok(historical: any[], indicators: any, index: number): string {
    const rsiSeries = indicators?.RSI7 || indicators?.RSI14 || indicators?.RSI21 || indicators?.RSI30 || [];
    if (
      index < 2 ||
      rsiSeries[index] == null ||
      rsiSeries[index - 1] == null ||
      historical[index]?.close == null ||
      historical[index - 1]?.close == null
    ) {
      return 'None';
    }

    const rsiToday = rsiSeries[index];
    const rsiPrev = rsiSeries[index - 1];
    const priceToday = historical[index].close;
    const pricePrev = historical[index - 1].close;

    // Add threshold to avoid noise
    const rsiChangeThreshold = 2; // Minimum RSI change
    const priceChangeThreshold = 0.5; // Minimum price change (%)
    const priceChangePercent = ((priceToday - pricePrev) / pricePrev) * 100;

    if (
      Math.abs(rsiToday - rsiPrev) < rsiChangeThreshold ||
      Math.abs(priceChangePercent) < priceChangeThreshold
    ) {
      return 'None'; // Ignore small changes
    }

    // Bullish Divergence: RSI decreasing, Price increasing
    if (rsiToday < rsiPrev && priceToday > pricePrev) {
      return 'Bullish';
    }

    // Bearish Divergence: RSI increasing, Price decreasing
    if (rsiToday > rsiPrev && priceToday < pricePrev) {
      return 'Bearish';
    }

    return 'None';
  }
  calculateRSIDivergence(
    historical: any[],
    indicators: any,
    index: number,
    rsiType: 'RSI7' | 'RSI14' | 'RSI21' | 'RSI30' = 'RSI14', // default to RSI14
    rsiChangeThreshold = 2,
    priceChangeThreshold = 0.5
  ): string {
    const rsiSeries = indicators?.[rsiType] || [];

    if (
      index < 1 ||
      rsiSeries[index] == null ||
      rsiSeries[index - 1] == null ||
      historical[index]?.close == null ||
      historical[index - 1]?.close == null
    ) {
      return 'None';
    }

    const rsiToday = rsiSeries[index];
    const rsiPrev = rsiSeries[index - 1];
    const priceToday = historical[index].close;
    const pricePrev = historical[index - 1].close;

    const priceChangePercent = ((priceToday - pricePrev) / pricePrev) * 100;

    // Optional debug logging
    console.log(`[${rsiType}] Index ${index}`);
    console.log(`RSI: ${rsiPrev} → ${rsiToday} | Price: ₹${pricePrev} → ₹${priceToday}`);
    console.log(`RSI Δ: ${Math.abs(rsiToday - rsiPrev)}, Price Δ: ${Math.abs(priceChangePercent)}%`);

    if (
      Math.abs(rsiToday - rsiPrev) < rsiChangeThreshold ||
      Math.abs(priceChangePercent) < priceChangeThreshold
    ) {
      return 'None';
    }

    if (rsiToday < rsiPrev && priceToday > pricePrev) {
      return 'Bullish Divergence';
    }

    if (rsiToday > rsiPrev && priceToday < pricePrev) {
      return 'Bearish Divergence';
    }

    return 'None';
  }


  calculateRSIDivergence_old(historical: any[], indicators: any, index: number): string {
    if (index === 0) return 'None'; // No previous data for first entry
    const rsiSeries = indicators?.RSI || [];
    if (index < 2 || !rsiSeries[index] || !rsiSeries[index - 1]) return 'None';
    console.log(`index: ${index}, rsiToday: ${rsiSeries[index]}, rsiPrev: ${rsiSeries[index - 1]}`);
    console.log('RSI Series:', indicators.RSI);
    console.log(`index: ${index}, priceToday: ${historical[index]?.close}, pricePrev: ${historical[index - 1]?.close}`);

    const rsiToday = rsiSeries[index];
    const rsiPrev = rsiSeries[index - 1];
    const priceToday = historical[index].close;
    const pricePrev = historical[index - 1].close;

    const rsiTrend = rsiToday > rsiPrev ? 'up' : (rsiToday < rsiPrev ? 'down' : 'flat');
    const priceTrend = priceToday > pricePrev ? 'up' : (priceToday < pricePrev ? 'down' : 'flat');
    if (rsiToday && rsiPrev && priceToday && pricePrev) {
      console.log(`rsiToday: ${rsiToday}, rsiPrev: ${rsiPrev}, priceToday: ${priceToday}, pricePrev: ${pricePrev}`);
      if (rsiToday < rsiPrev && priceToday > pricePrev) return 'Bullish Divergence';
      if (rsiToday > rsiPrev && priceToday < pricePrev) return 'Bearish Divergence';
      return 'None';
    }
    if (rsiTrend !== priceTrend) return 'Divergence';
    return 'None';
  }


  ngOnInit() {
    var pd = { 'symbol': this.config.symbols, "range": this.selectedInterval, "reportType": 'day' }
    console.log("pd", pd)
    // this.getExchangeFromSymbol(item.symbols)
    this.postService.report(pd).subscribe({
      next: (res: any) => {
        if (res['message'] == 'Done') {
          this.loader.hide()

          console.log(res)
          this.symbol = res.data[0].symbol;
          this.currentPrice = res.data[0].currentPrice;
          this.currency = res.data[0].currency
          this.lastUpdated = new Date(res.data[0].lastUpdated);
          this.cdref.detectChanges()
        }
      },
      error: (error) => {
        this.loader.hide()
        console.log(error)
      }
    })
  }


  getanaylisdata(config: AnalysisConfig) {
    console.log(config)
    this.loader.show()
    this.postService.anaylisi(config).subscribe({
      next: (res: any) => {
        this.loader.hide()
        this.getExchangeFromSymbol(this.config.symbols[0]);
        console.log('Response:', res);

        if (!res.success) {
          console.error('API error:', res.error);
          return;
        }

        // Step 1: Extract and prepare raw data
        const historical = res.data.historical || [];
        const indicators = res.data.indicators || {};
        this.symbol = res.data.symbol;
        this.currentPrice = res.data.currentPrice;
        this.lastUpdated = new Date(res.data.lastUpdated);

        // Step 2: Calculate daily percentage change and trend
        // const enrichedHistorical = historical.map((day: any, i: number) => {
        //   const prevClose = historical[i - 1]?.close ?? null;
        //   const change = prevClose != null ? ((day.close - prevClose) / prevClose) * 100 : null;
        //   const trend = prevClose == null ? null : (day.close > prevClose ? 'up' : (day.close < prevClose ? 'down' : 'neutral'));

        //   // Step 3: Attach indicator values by index
        //   const indicatorValues: { [key: string]: any } = {};
        //   for (const key in indicators) {
        //     indicatorValues[key] = indicators[key][i] ?? null;
        //   }

        //   return {
        //     ...day,
        //     dailyChangePercent: change,
        //     trend,
        //     ...indicatorValues
        //   };
        // });

        const enrichedHistorical = historical.map((day: any, i: number) => {
          const prevClose = historical[i - 1]?.close ?? null;
          const change = prevClose != null ? ((day.close - prevClose) / prevClose) * 100 : null;
          const trend = prevClose == null ? null : (day.close > prevClose ? 'up' : (day.close < prevClose ? 'down' : 'neutral'));

          const indicatorValues: { [key: string]: any } = {};

          for (const key in indicators) {
            const val = indicators[key][i];
            console.log(val)
            if (val && typeof val === 'object' && !Array.isArray(val)) {
              for (const subKey in val) {
                indicatorValues[`${subKey}`] = val[subKey];
                console.log("val", indicatorValues)
              }
            } else if (val !== undefined) {
              indicatorValues[key] = val;
              console.log("val", indicatorValues)
            } else {
              // Optional: explicitly set null if you want consistent structure
              indicatorValues[key] = null;
              console.log("val", indicatorValues)
            }
          }


          // Custom Calculations
          let rStrength = null;
          let momentum = null;
          let performance = null;
          let divergence = null;
          if (this.selectedReportType == 'technical') {
            rStrength = this.calculateRelativeStrength(historical, i, this.relativeStrengthPeriod);
            momentum = this.calculateMomentumScore(historical, i, this.momentumScorePeriod);
            performance = this.calculateStockPerformance(day);
            divergence = this.calculateRSIDivergence(historical, indicators, i);
            console.log("rStrength", rStrength, "momentum", momentum, "performance", performance, "divergence", divergence)
          }


          return {
            ...day,
            dailyChangePercent: change,
            trend,
            ...indicatorValues,
            'RS': rStrength || null,
            'MOM': momentum || null,
            'PERF': performance || null,
            'RSIDiv': divergence || null,
          };

        });


        // Step 4: Determine currency from symbol suffix
        if (this.symbol.endsWith('.NS')) {
          this.currency = 'INR';
        } else if (this.symbol.endsWith('.L')) {
          this.currency = 'GBP';
        } else if (this.symbol.endsWith('.T')) {
          this.currency = 'JPY';
        } else {
          this.currency = 'USD';
        }
        // Step 5: Build displayedColumns dynamically (date, open, ..., indicators)
        if (config.reportType == 'price') {
          this.displayedColumns = ['date', 'open', 'high', 'low', 'close',];
        } else if (config.reportType == 'volume') {
          this.displayedColumns = ['date', 'open', 'high', 'low', 'close', 'volume', 'change',];
        } else if (config.reportType == 'technical') {
          this.displayedColumns = ['date', 'open', 'high', 'low', 'close', 'volume', 'change', 'RS', 'MOM', 'PERF', 'RSIDiv'];
        }
        else {
          this.displayedColumns = ['date', 'open', 'high', 'low', 'close', 'volume', 'change',];
        }

        console.log(this.displayedColumns)
        // Ensure base columns are included

        // for (const key in indicators) {
        //   if (!this.displayedColumns.includes(key)) {
        //     this.displayedColumns.push(key);
        //   }
        // }
        // Add indicator columns dynamically
        for (const key in indicators) {
          const series = indicators[key];
          const subKeys = new Set<string>();

          for (const entry of series) {
            if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
              for (const subKey in entry) {
                subKeys.add(subKey);
              }
            }
          }

          if (subKeys.size > 0) {
            for (const subKey of subKeys) {
              const simplifiedKey = subKey; // Use just "MACD", "signal", etc.
              if (!this.displayedColumns.includes(simplifiedKey)) {
                this.displayedColumns.push(simplifiedKey);
              }
            }
          } else {
            if (!this.displayedColumns.includes(key)) {
              this.displayedColumns.push(key);
            }
          }
        }


        // Step 6: Set dataSource
        this.dataSource = new MatTableDataSource(enrichedHistorical);
        console.log(this.dataSource)
        // Step 7: Detect changes to avoid ExpressionChangedAfterItHasBeenCheckedError
        this.cdref.detectChanges();
      },
      error: (err: any) => {
        this.loader.hide()

        console.error("error", err);
      }
    });
  }


  // Example assuming dataSource.data is already populated

  transformToCandlestickSeries(data: Array<any>) {
    return data.map(item => ({
      x: new Date(item.date),
      y: [item.open, item.high, item.low, item.close]
    }));
  }



  updateChart() {
    const data = this.dataSource?.data;
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
