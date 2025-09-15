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
  NgApexchartsModule,
  ApexDataLabels,
  ApexLegend,
  ApexTooltip,
  ApexAnnotations,
  ApexMarkers
} from 'ng-apexcharts';

import { MatButtonToggleModule } from '@angular/material/button-toggle';
export type ChartOptions = {
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis | ApexYAxis[];
  stroke: ApexStroke;
  colors: string[];
  legend: ApexLegend;
  tooltip: ApexTooltip;
  annotations: ApexAnnotations;
  plotOptions: ApexPlotOptions;
  fill: ApexFill;
  markers: ApexMarkers;
  dataLabels: ApexDataLabels;
};
import { ApexYAxis } from 'ng-apexcharts';
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
interface IndicatorResult {
  [key: string]: number[] | { [subKey: string]: number[] };
}

interface StochasticResult {
  k: number[];
  d: number[];
}

interface BollingerBandsResult {
  upper: number[];
  middle: number[];
  lower: number[];
}


@Component({
  selector: 'app-analysis',
  imports: [CommonModule, NgApexchartsModule, FormsModule, MatTabsModule, MatTableModule, MatSortModule, NumberSuffixPipe, MatButtonToggleModule,],
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
  chartTypes = [
    { value: 'candlestick', label: 'Candlestick Bollinger' },
    { value: 'technical-overview', label: 'Technical Overview' },
    { value: 'rsi-chart', label: 'RSI Analysis' },
    { value: 'bollinger-chart', label: 'Bollinger Bands' },
    { value: 'line', label: 'Price Line' },
    { value: 'bar', label: 'Volume Bars' },
  ];
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
  chartConfig = {
    type: 'candlestick',
    data: this.dataSource?.data || [] // must include open, high, low, close, date fields
  };

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


  isDoji(open: number, high: number, low: number, close: number): boolean {
    const body = Math.abs(close - open);
    const range = high - low;
    return body / range < 0.1; // or your own threshold
  }

  isHammer(open: number, high: number, low: number, close: number): boolean {
    const body = Math.abs(close - open);
    const lowerShadow = open < close ? open - low : close - low;
    const upperShadow = high - Math.max(open, close);
    return lowerShadow > 2 * body && upperShadow < body;
  }

  isShootingStar(open: number, high: number, low: number, close: number): boolean {
    const body = Math.abs(close - open);
    const upperShadow = high - Math.max(open, close);
    const lowerShadow = Math.min(open, close) - low;
    return upperShadow > 2 * body && lowerShadow < body;
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
      return 'Bullish';
    }

    if (rsiToday > rsiPrev && priceToday < pricePrev) {
      return 'Bearish';
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
  safeGet(arr: any[], i: number) {
    return Array.isArray(arr) && arr.length > i ? arr[i] : null;
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




  /**
   * Calculate Bollinger Bands with proper handling of insufficient data
   */
  calculateBollingerBands(
    prices: number[],
    period: number = 20,
    stdDev: number = 2
  ): BollingerBandsResult {
    const upper: number[] = [];
    const middle: number[] = [];
    const lower: number[] = [];

    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        // Not enough data for full calculation - use available data
        const availablePrices = prices.slice(0, i + 1);
        if (availablePrices.length >= 2) {
          const avg = availablePrices.reduce((sum, p) => sum + p, 0) / availablePrices.length;
          const variance = availablePrices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / availablePrices.length;
          const std = Math.sqrt(variance);
          upper.push(avg + (stdDev * std));
          middle.push(avg);
          lower.push(avg - (stdDev * std));
        } else {
          upper.push(prices[i]);
          middle.push(prices[i]);
          lower.push(prices[i]);
        }
      } else {
        // Full calculation with specified period
        const window = prices.slice(i - period + 1, i + 1);
        const avg = window.reduce((sum, p) => sum + p, 0) / period;
        const variance = window.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / period;
        const std = Math.sqrt(variance);
        upper.push(avg + (stdDev * std));
        middle.push(avg);
        lower.push(avg - (stdDev * std));
      }
    }

    return { upper, middle, lower };
  }

  /**
   * Calculate Average True Range with proper handling of insufficient data
   */
  calculateATR(
    highPrices: number[],
    lowPrices: number[],
    closePrices: number[],
    period: number = 14
  ): number[] {
    const atrValues: number[] = [];
    const trueRanges: number[] = [];

    for (let i = 0; i < highPrices.length; i++) {
      let tr: number;

      if (i === 0) {
        // First day - use high - low
        tr = highPrices[i] - lowPrices[i];
      } else {
        // Calculate True Range
        const tr1 = highPrices[i] - lowPrices[i];
        const tr2 = Math.abs(highPrices[i] - closePrices[i - 1]);
        const tr3 = Math.abs(lowPrices[i] - closePrices[i - 1]);
        tr = Math.max(tr1, tr2, tr3);
      }

      trueRanges.push(tr);

      if (i < period - 1) {
        // Not enough data for full ATR - use average of available TRs
        if (trueRanges.length >= 2) {
          const atr = trueRanges.reduce((sum, val) => sum + val, 0) / trueRanges.length;
          atrValues.push(atr);
        } else {
          atrValues.push(tr); // Use current TR for first day
        }
      } else {
        // Full ATR calculation
        const window = trueRanges.slice(i - period + 1, i + 1);
        const atr = window.reduce((sum, val) => sum + val, 0) / period;
        atrValues.push(atr);
      }
    }

    return atrValues;
  }

  /**
   * Calculate RSI with proper handling of insufficient data
   */
  calculateRSI(prices: number[], period: number = 14): number[] {
    const rsiValues: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 0; i < prices.length; i++) {
      if (i === 0) {
        rsiValues.push(50); // Neutral RSI for first day
        continue;
      }

      const change = prices[i] - prices[i - 1];
      const gain = Math.max(change, 0);
      const loss = Math.max(-change, 0);

      gains.push(gain);
      losses.push(loss);

      let avgGain: number;
      let avgLoss: number;

      if (i < period) {
        // Not enough data for full RSI - use available data
        avgGain = gains.length > 0 ? gains.reduce((sum, val) => sum + val, 0) / gains.length : 0;
        avgLoss = losses.length > 0 ? losses.reduce((sum, val) => sum + val, 0) / losses.length : 0.01;
      } else {
        // Full RSI calculation
        const gainWindow = gains.slice(i - period, i);
        const lossWindow = losses.slice(i - period, i);
        avgGain = gainWindow.reduce((sum, val) => sum + val, 0) / period;
        avgLoss = lossWindow.reduce((sum, val) => sum + val, 0) / period;
      }

      if (avgLoss === 0) {
        rsiValues.push(100);
      } else {
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        rsiValues.push(rsi);
      }
    }

    return rsiValues;
  }

  /**
   * Calculate Stochastic Oscillator with proper handling of insufficient data
   */
  calculateStochastic(
    highPrices: number[],
    lowPrices: number[],
    closePrices: number[],
    kPeriod: number = 14,
    dPeriod: number = 3
  ): StochasticResult {
    const kValues: number[] = [];
    const dValues: number[] = [];

    for (let i = 0; i < closePrices.length; i++) {
      let highestHigh: number;
      let lowestLow: number;

      if (i < kPeriod - 1) {
        // Not enough data - use available data
        const availableHighs = highPrices.slice(0, i + 1);
        const availableLows = lowPrices.slice(0, i + 1);
        highestHigh = Math.max(...availableHighs);
        lowestLow = Math.min(...availableLows);
      } else {
        // Full calculation
        const windowHighs = highPrices.slice(i - kPeriod + 1, i + 1);
        const windowLows = lowPrices.slice(i - kPeriod + 1, i + 1);
        highestHigh = Math.max(...windowHighs);
        lowestLow = Math.min(...windowLows);
      }

      let k: number;
      if (highestHigh === lowestLow) {
        k = 50; // Neutral value when no range
      } else {
        k = ((closePrices[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
      }

      kValues.push(k);

      // Calculate %D (moving average of %K)
      let d: number;
      if (i < dPeriod - 1) {
        d = kValues.reduce((sum, val) => sum + val, 0) / kValues.length;
      } else {
        const kWindow = kValues.slice(i - dPeriod + 1, i + 1);
        d = kWindow.reduce((sum, val) => sum + val, 0) / dPeriod;
      }

      dValues.push(d);
    }

    return { k: kValues, d: dValues };
  }

  /**
   * Calculate Williams %R with proper handling of insufficient data
   */
  calculateWilliamsR(
    highPrices: number[],
    lowPrices: number[],
    closePrices: number[],
    period: number = 14
  ): number[] {
    const williamsRValues: number[] = [];

    for (let i = 0; i < closePrices.length; i++) {
      let highestHigh: number;
      let lowestLow: number;

      if (i < period - 1) {
        // Not enough data - use available data
        const availableHighs = highPrices.slice(0, i + 1);
        const availableLows = lowPrices.slice(0, i + 1);
        highestHigh = Math.max(...availableHighs);
        lowestLow = Math.min(...availableLows);
      } else {
        // Full calculation
        const windowHighs = highPrices.slice(i - period + 1, i + 1);
        const windowLows = lowPrices.slice(i - period + 1, i + 1);
        highestHigh = Math.max(...windowHighs);
        lowestLow = Math.min(...windowLows);
      }

      let williamsR: number;
      if (highestHigh === lowestLow) {
        williamsR = -50; // Neutral value
      } else {
        williamsR = ((highestHigh - closePrices[i]) / (highestHigh - lowestLow)) * -100;
      }

      williamsRValues.push(williamsR);
    }

    return williamsRValues;
  }

  /**
   * Calculate Commodity Channel Index with proper handling of insufficient data
   */
  calculateCCI(
    highPrices: number[],
    lowPrices: number[],
    closePrices: number[],
    period: number = 20
  ): number[] {
    const cciValues: number[] = [];

    for (let i = 0; i < closePrices.length; i++) {
      // Calculate Typical Price
      const typicalPrice = (highPrices[i] + lowPrices[i] + closePrices[i]) / 3;

      let sma: number;
      let meanDeviation: number;

      if (i < period - 1) {
        // Not enough data - use available data
        const availableTypical: number[] = [];
        for (let j = 0; j <= i; j++) {
          const tp = (highPrices[j] + lowPrices[j] + closePrices[j]) / 3;
          availableTypical.push(tp);
        }

        sma = availableTypical.reduce((sum, val) => sum + val, 0) / availableTypical.length;
        meanDeviation = availableTypical.reduce((sum, val) => sum + Math.abs(val - sma), 0) / availableTypical.length;
      } else {
        // Full calculation
        const typicalPrices: number[] = [];
        for (let j = i - period + 1; j <= i; j++) {
          const tp = (highPrices[j] + lowPrices[j] + closePrices[j]) / 3;
          typicalPrices.push(tp);
        }

        sma = typicalPrices.reduce((sum, val) => sum + val, 0) / period;
        meanDeviation = typicalPrices.reduce((sum, val) => sum + Math.abs(val - sma), 0) / period;
      }

      let cci: number;
      if (meanDeviation === 0) {
        cci = 0;
      } else {
        cci = (typicalPrice - sma) / (0.015 * meanDeviation);
      }

      cciValues.push(cci);
    }

    return cciValues;
  }

  /**
   * Calculate ADX with proper handling of insufficient data
   */
  calculateADX(
    highPrices: number[],
    lowPrices: number[],
    closePrices: number[],
    period: number = 14
  ): number[] {
    const adxValues: number[] = [];
    const dmPlus: number[] = [];
    const dmMinus: number[] = [];
    const trValues: number[] = [];

    for (let i = 0; i < highPrices.length; i++) {
      if (i === 0) {
        adxValues.push(25); // Neutral ADX for first day
        continue;
      }

      // Calculate Directional Movement
      const upMove = highPrices[i] - highPrices[i - 1];
      const downMove = lowPrices[i - 1] - lowPrices[i];

      const plusDM = upMove > downMove && upMove > 0 ? upMove : 0;
      const minusDM = downMove > upMove && downMove > 0 ? downMove : 0;

      dmPlus.push(plusDM);
      dmMinus.push(minusDM);

      // Calculate True Range
      const tr1 = highPrices[i] - lowPrices[i];
      const tr2 = Math.abs(highPrices[i] - closePrices[i - 1]);
      const tr3 = Math.abs(lowPrices[i] - closePrices[i - 1]);
      const tr = Math.max(tr1, tr2, tr3);
      trValues.push(tr);

      let avgPlusDM: number;
      let avgMinusDM: number;
      let avgTR: number;

      if (i < period) {
        // Not enough data - use available data
        avgPlusDM = dmPlus.length > 0 ? dmPlus.reduce((sum, val) => sum + val, 0) / dmPlus.length : 0;
        avgMinusDM = dmMinus.length > 0 ? dmMinus.reduce((sum, val) => sum + val, 0) / dmMinus.length : 0;
        avgTR = trValues.length > 0 ? trValues.reduce((sum, val) => sum + val, 0) / trValues.length : 1;
      } else {
        // Full calculation
        const plusWindow = dmPlus.slice(i - period + 1, i + 1);
        const minusWindow = dmMinus.slice(i - period + 1, i + 1);
        const trWindow = trValues.slice(i - period + 1, i + 1);
        avgPlusDM = plusWindow.reduce((sum, val) => sum + val, 0) / period;
        avgMinusDM = minusWindow.reduce((sum, val) => sum + val, 0) / period;
        avgTR = trWindow.reduce((sum, val) => sum + val, 0) / period;
      }

      let adx: number;
      if (avgTR === 0) {
        adx = 25;
      } else {
        const plusDI = (avgPlusDM / avgTR) * 100;
        const minusDI = (avgMinusDM / avgTR) * 100;

        if (plusDI + minusDI === 0) {
          adx = 25;
        } else {
          const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
          adx = dx; // Simplified ADX calculation
        }
      }

      adxValues.push(adx);
    }

    return adxValues;
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
          const closePrices = historical.map((day: { close: any; }) => day.close);
          const highPrices = historical.map((day: { high: any; }) => day.high);
          const lowPrices = historical.map((day: { low: any; }) => day.low);

          const bollinger = this.calculateBollingerBands(closePrices, 20, 2);
          const atr = this.calculateATR(highPrices, lowPrices, closePrices, 14);
          const adx = this.calculateADX(highPrices, lowPrices, closePrices, 14);
          const stochastic = this.calculateStochastic(highPrices, lowPrices, closePrices, 14, 3);
          const williamsR = this.calculateWilliamsR(highPrices, lowPrices, closePrices, 14);
          const cci = this.calculateCCI(highPrices, lowPrices, closePrices, 20);
          const rsi7 = this.calculateRSI(closePrices, 7);
          const rsi14 = this.calculateRSI(closePrices, 14);
          return {
            ...day,
            dailyChangePercent: change,
            trend,
            ...indicatorValues,
            'RS': rStrength || null,
            'MOM': momentum || null,
            'PERF': performance || null,
            'RSIDiv': divergence || null,
            'BB_width': bollinger.upper[i] && bollinger.lower[i] ? ((bollinger.upper[i] - bollinger.lower[i]) / bollinger.middle[i]) * 100 : null,
            'ATR': atr[i] || null,
            'ADX': adx[i] || null,
            'STOCH_k': stochastic.k[i] || null,
            'STOCH_d': stochastic.d[i] || null,
            'WILLIAMS_R': williamsR[i] || null,
            'CCI': cci[i] || null,
            'RSI7': rsi7[i] || null,
            'RSI14': rsi14[i] || null,
            'Doji': this.isDoji(day.open, day.high, day.low, day.close),
            'Hammer': this.isHammer(day.open, day.high, day.low, day.close),
            'ShootingStar': this.isShootingStar(day.open, day.high, day.low, day.close),
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
          this.displayedColumns = ['date', 'open', 'high', 'low', 'close', 'volume', 'change', 'RS', 'MOM', 'PERF', 'RSIDiv', 'BB_width', 'ATR', 'ADX', 'STOCH_k', 'STOCH_d', 'WILLIAMS_R', 'CCI', 'Doji', 'Hammer', 'ShootingStar'];
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

  onChartTypeChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const selectedValue = selectElement.value;
    console.log('chart type', selectedValue);
    this.chartType = selectedValue;
    this.updateChart();
  }


  updateChart() {
    const data = this.dataSource?.data;
    const xValues = data.map((d: any) => new Date(d.date).toLocaleDateString());

    switch (this.chartType) {
      case 'candlestick':
        this.createCandlestickWithIndicators(data, xValues);
        break;
      case 'technical-overview':
        this.createTechnicalOverview(data, xValues);
        break;
      case 'rsi-chart':
        this.createRSIChart(data, xValues);
        break;
      case 'bollinger-chart':
        this.createBollingerChart(data, xValues);
        break;
      case 'volume-indicators':
        this.createVolumeIndicators(data, xValues);
        break;
      case 'line':
        this.createLineWithOverlays(data, xValues);
        break;
      case 'bar':
        this.createVolumeChart(data, xValues);
        break;
      case 'donut':
        // this.createDonutChart(data, xValues);
        break;
      default:
        this.chartOptions = {};
    }
  }
  createCandlestickWithIndicators(data: any[], xValues: string[]) {
    if (!data || data.length === 0) {
      this.chartOptions = {};
      return;
    }

    if (data.length < 2) {
      console.warn('Not enough data to create candlestick chart.');
      this.chartOptions = {};
      return;
    }

    this.chartOptions = {
      series: [
        // Candlestick data
        {
          name: 'Price',
          type: 'candlestick',
          data: data.map((d: any) => ({
            x: new Date(d.date).toISOString(), // ISO format datetime
            y: [
              parseFloat(d.open?.toFixed(2) || '0'),
              parseFloat(d.high?.toFixed(2) || '0'),
              parseFloat(d.low?.toFixed(2) || '0'),
              parseFloat(d.close?.toFixed(2) || '0')
            ]
          }))
        },
        // Bollinger Bands Upper
        {
          name: 'BB Upper',
          type: 'line',
          data: data.map((d: any) => ({
            x: new Date(d.date).toISOString(),
            y: parseFloat((d.BB_upper || d.close)?.toFixed(2) || '0')
          }))
        },
        // Bollinger Bands Middle (SMA)
        {
          name: 'BB Middle',
          type: 'line',
          data: data.map((d: any) => ({
            x: new Date(d.date).toISOString(),
            y: parseFloat((d.BB_middle || d.close)?.toFixed(2) || '0')
          }))
        },
        // Bollinger Bands Lower
        {
          name: 'BB Lower',
          type: 'line',
          data: data.map((d: any) => ({
            x: new Date(d.date).toISOString(),
            y: parseFloat((d.BB_lower || d.close)?.toFixed(2) || '0')
          }))
        }
      ] as any[],
      chart: {
        type: 'candlestick',
        height: 450,
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true
          }
        }
      },
      xaxis: {
        type: 'datetime' // ✅ DO NOT set categories when using datetime
      },
      yaxis: {
        tooltip: {
          enabled: true
        }
      },
      stroke: {
        width: [1, 2, 2, 2],
        curve: 'smooth'
      },
      colors: ['#00E396', '#FF4560', '#775DD0', '#FEB019'],
      legend: {
        show: true,
        position: 'top'
      },
      tooltip: {
        shared: true,
        custom: ({ seriesIndex, dataPointIndex, w }) => {
          if (seriesIndex === 0) {
            const o = w.globals.seriesCandleO[seriesIndex][dataPointIndex];
            const h = w.globals.seriesCandleH[seriesIndex][dataPointIndex];
            const l = w.globals.seriesCandleL[seriesIndex][dataPointIndex];
            const c = w.globals.seriesCandleC[seriesIndex][dataPointIndex];
            const dataPoint = data[dataPointIndex];

            return `
            <div class="arrow_box p-3">
              <strong>Price Data</strong><br>
              <span>Open: ${this.currency}${o?.toFixed(2)}</span><br>
              <span>High: ${this.currency}${h?.toFixed(2)}</span><br>
              <span>Low: ${this.currency}${l?.toFixed(2)}</span><br>
              <span>Close: ${this.currency}${c?.toFixed(2)}</span><br>
              <span>Volume: ${dataPoint.volume}</span><br>
              <hr>
              <strong>Technical Indicators</strong><br>
              <span>RSI(14): ${dataPoint.RSI14?.toFixed(2) || 'N/A'}</span><br>
              <span>ATR: ${dataPoint.ATR?.toFixed(2) || 'N/A'}</span><br>
              <span>ADX: ${dataPoint.ADX?.toFixed(2) || 'N/A'}</span>
            </div>
          `;
          }
          return '';
        }
      }
    };
  }


  createTechnicalOverview(data: any[], xValues: string[]) {
    this.chartOptions = {
      series: [
        // Price Line
        {
          name: 'Close Price',
          type: 'line',
          data: data.map((d: any) => parseFloat(d.close?.toFixed(2) || 0)),
          yAxisIndex: 0
        },
        // RSI
        {
          name: 'RSI(14)',
          type: 'line',
          data: data.map((d: any) => parseFloat(d.RSI14?.toFixed(2) || 50))
        },
        // Stochastic %K
        {
          name: 'Stoch %K',
          type: 'line',
          data: data.map((d: any) => parseFloat(d.STOCH_k?.toFixed(2) || 50))
        },
        // Williams %R
        {
          name: 'Williams %R',
          type: 'line',
          data: data.map((d: any) => parseFloat(d.WILLIAMS_R?.toFixed(2) || -50))
        }
      ] as any[],
      chart: {
        type: 'line',
        height: 600,
        stacked: false
      },
      xaxis: {
        categories: xValues,
        type: 'category'
      },
      yaxis: [
        // Price Y-axis (Left)
        {
          seriesName: 'Close Price',
          axisTicks: { show: true },
          axisBorder: {
            show: true,
            color: '#008FFB'
          },
          labels: {
            style: { colors: '#008FFB' }
          },
          title: {
            text: 'Price ($)',
            style: { color: '#008FFB' }
          }
        },
        // Oscillators Y-axis (Right)
        {
          seriesName: 'RSI(14)',
          opposite: true,
          min: -100,
          max: 100,
          axisTicks: { show: true },
          axisBorder: {
            show: true,
            color: '#00E396'
          },
          labels: {
            style: { colors: '#00E396' }
          },
          title: {
            text: 'Oscillators',
            style: { color: '#00E396' }
          }
        }
      ],
      stroke: {
        width: [3, 2, 2, 2],
        curve: 'smooth'
      },
      colors: ['#008FFB', '#00E396', '#FEB019', '#FF4560'],
      legend: {
        show: true,
        position: 'top'
      },
      annotations: {
        yaxis: [
          // RSI overbought/oversold lines
          {
            y: 70,
            yAxisIndex: 1,
            borderColor: '#FF4560',
            strokeDashArray: 3,
            label: { text: 'Overbought (70)' }
          },
          {
            y: 30,
            yAxisIndex: 1,
            borderColor: '#00E396',
            strokeDashArray: 3,
            label: { text: 'Oversold (30)' }
          }
        ]
      }
    };
  }
  createRSIChart(data: any[], xValues: string[]) {
    this.chartOptions = {
      series: [
        {
          name: 'RSI(7)',
          type: 'line',
          data: data.map((d: any) => parseFloat(d.RSI7?.toFixed(2) || 50))
        },
        {
          name: 'RSI(14)',
          type: 'line',
          data: data.map((d: any) => parseFloat(d.RSI14?.toFixed(2) || 50))
        }
      ],
      chart: {
        type: 'line',
        height: 400
      },
      xaxis: {
        categories: xValues
      },
      yaxis: {
        min: 0,
        max: 100,
        title: { text: 'RSI Value' }
      },
      stroke: {
        width: [2, 3],
        curve: 'smooth'
      },
      colors: ['#FEB019', '#00E396'],
      annotations: {
        yaxis: [
          {
            y: 70,
            borderColor: '#FF4560',
            strokeDashArray: 3,
            label: {
              text: 'Overbought (70)',
              style: { color: '#FF4560' }
            }
          },
          {
            y: 30,
            borderColor: '#00E396',
            strokeDashArray: 3,
            label: {
              text: 'Oversold (30)',
              style: { color: '#00E396' }
            }
          },
          {
            y: 50,
            borderColor: '#775DD0',
            strokeDashArray: 1,
            label: {
              text: 'Midline (50)',
              style: { color: '#775DD0' }
            }
          }
        ]
      },
      tooltip: {
        y: {
          formatter: (val: number) => `${val.toFixed(2)}`
        }
      }
    };
  }

  createBollingerChart(data: any[], xValues: string[]) {
    this.chartOptions = {
      series: [
        {
          name: 'Close Price',
          type: 'line',
          data: data.map((d: any) => parseFloat(d.close?.toFixed(2) || 0))
        },
        {
          name: 'BB Upper',
          type: 'line',
          data: data.map((d: any) => parseFloat((d.BB_upper || d.close)?.toFixed(2) || 0))
        },
        {
          name: 'BB Middle (SMA)',
          type: 'line',
          data: data.map((d: any) => parseFloat((d.BB_middle || d.close)?.toFixed(2) || 0))
        },
        {
          name: 'BB Lower',
          type: 'line',
          data: data.map((d: any) => parseFloat((d.BB_lower || d.close)?.toFixed(2) || 0))
        }
      ],
      chart: {
        type: 'line',
        height: 450
      },
      xaxis: {
        categories: xValues
      },
      stroke: {
        width: [3, 2, 2, 2],
        curve: 'smooth'
      },
      colors: ['#008FFB', '#FF4560', '#775DD0', '#FEB019'],
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'light',
          type: 'vertical',
          shadeIntensity: 0.25,
          gradientToColors: undefined,
          inverseColors: true,
          opacityFrom: 0.85,
          opacityTo: 0.65
        }
      },
      tooltip: {
        shared: true,
        y: {
          formatter: (val: number) => `${this.currency}${val.toFixed(2)}`
        }
      }
    };
  }

  createVolumeIndicators(data: any[], xValues: string[]) {
    this.chartOptions = {
      series: [
        {
          name: 'Volume',
          type: 'column',
          data: data.map((d: any) => parseFloat((d.volume / 1_000_000)?.toFixed(1) || '0')),
          yAxisIndex: 0
        },
        {
          name: 'ATR',
          type: 'line',
          data: data.map((d: any) => parseFloat(d.ATR?.toFixed(2) || 0)),
          yAxisIndex: 1
        },
        {
          name: 'ADX',
          type: 'line',
          data: data.map((d: any) => parseFloat(d.ADX?.toFixed(2) || 25)),
          yAxisIndex: 1
        },
        {
          name: 'CCI',
          type: 'line',
          data: data.map((d: any) => parseFloat(d.CCI?.toFixed(2) || 0)),
          yAxisIndex: 2
        }
      ] as any[],
      chart: {
        type: 'line',
        height: 500,
        stacked: false
      },
      xaxis: {
        categories: xValues
      },
      yaxis: [
        // Volume Y-axis
        {
          seriesName: 'Volume',
          title: { text: 'Volume (M)' },
          labels: { style: { colors: '#008FFB' } }
        },
        // ATR/ADX Y-axis  
        {
          seriesName: 'ATR',
          opposite: true,
          title: { text: 'ATR / ADX' },
          labels: { style: { colors: '#00E396' } }
        },
        // CCI Y-axis
        {
          seriesName: 'CCI',
          opposite: true,
          show: false
        }
      ],
      stroke: {
        width: [0, 2, 2, 2],
        curve: 'smooth'
      },
      plotOptions: {
        bar: {
          columnWidth: '80%'
        }
      },
      colors: ['#008FFB', '#00E396', '#FEB019', '#FF4560']
    };
  }

  createLineWithOverlays(data: any[], xValues: string[]) {
    this.chartOptions = {
      series: [
        {
          name: 'Close Price',
          data: data.map((d: any) => parseFloat(d.close?.toFixed(2) || 0))
        },
        {
          name: 'BB Upper',
          data: data.map((d: any) => parseFloat((d.BB_upper || d.close)?.toFixed(2) || 0))
        },
        {
          name: 'BB Lower',
          data: data.map((d: any) => parseFloat((d.BB_lower || d.close)?.toFixed(2) || 0))
        }
      ] as any,
      chart: {
        type: 'line',
        height: 350,
        zoom: { enabled: true }
      },
      xaxis: {
        categories: xValues
      },
      stroke: {
        width: [3, 2, 2],
        curve: 'smooth'
      },
      markers: {
        size: 0,
        hover: { size: 5 }
      },
      tooltip: {
        shared: true,
        y: {
          formatter: (val: number) => `${this.currency}${val.toFixed(2)}`
        }
      }
    };
  }

  createVolumeChart(data: any[], xValues: string[]) {
    this.chartOptions = {
      series: [{
        name: 'Volume',
        data: data.map((d: any) => ({
          x: d.date,
          y: parseFloat((d.volume / 1_000_000)?.toFixed(1) || '0'),
          fillColor: d.trend === 'up' ? '#00E396' : '#FF4560'
        }))
      }],
      chart: {
        type: 'bar',
        height: 350
      },
      xaxis: {
        categories: xValues,
        type: 'category'
      },
      plotOptions: {
        bar: {
          colors: {
            ranges: [{
              from: 0,
              to: 1000,
              color: '#FF4560'
            }, {
              from: 1000,
              to: 10000,
              color: '#00E396'
            }]
          },
          columnWidth: '80%'
        }
      },
      dataLabels: {
        enabled: false
      },
      tooltip: {
        y: {
          formatter: (val: number) => `${val}M`
        }
      }
    };
  }






}
