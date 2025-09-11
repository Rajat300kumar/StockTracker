import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, input, OnChanges, SimpleChanges } from '@angular/core';
import { LoaderService } from '../../service/loader';
import { Post } from '../../service/post';
import { FormsModule } from '@angular/forms';
export interface pridection {
  symbols: string[];
  range: string;
  reportType: string
}
interface PredictionData {
  stock: string;
  interval: string;
  predictedClose: number;
  predictionDate: string;
  confidence: number;
  riskLevel: string;
  trainedDate: string;
  best: number;
  base: number;
  worst: number;
  backtestAccuracy: number;
  yahooAccuracy: number;
  smaAccuracy: number;
  mape?: number;  // add this optional property for prediction error margin
  drivers: {
    ema20: number;
    rsi14: number;
    sentiment: string;
  };
  riskFactors: string[];
  history: {
    date: string;
    predicted: string;
    actual: string;
    error: string;
  }[];
}

@Component({
  selector: 'app-prediction',
  imports: [CommonModule, FormsModule],
  templateUrl: './prediction.html',
  styleUrl: './prediction.css'
})
export class Prediction implements OnChanges {
  @Input() config!: pridection
  stockSymbol = 'TCS.NS';
  intervals: string[] = ['1 D', '5 D', '1 M', '6 M', 'YTD', '1 Y', '5 Y', 'MAX'];
  constructor(private cdref: ChangeDetectorRef, private loader: LoaderService, private postService: Post) { }
  driverImpacts: { [key: string]: 'up' | 'down' } = {};
  selectedPredictionDate: string = '';

  currentPrice = 189.23;
  currency = 'USD';
  symbol = '';
  lastUpdated = new Date();
  percentageChange: number | null = null;
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



  interval = '1D';
  selectedInterval: string = '1 D';

  targetDate = '';
  predictionData: any = null;
  loading = false;
  error = '';
  data: PredictionData = {
    stock: "",
    interval: "",
    predictedClose: 0,
    predictionDate: "",
    confidence: 0,
    riskLevel: "",
    trainedDate: "",
    best: 0,
    base: 0,
    worst: 0,
    backtestAccuracy: 0,
    yahooAccuracy: 0,
    smaAccuracy: 0,
    mape: 0,  // Expected prediction error margin (MAPE)
    drivers: {
      ema20: 0,
      rsi14: 0,
      sentiment: ""
    },
    riskFactors: [
      "Volatility: High",
      "Earnings report due in 3 days"
    ],
    history: [
      { date: "", predicted: "", actual: "0", error: "" },
      { date: "", predicted: "", actual: "", error: "" },
    ]
  };

  getRiskClass(riskLevel: string): string {
    if (!riskLevel) return 'risk-unknown';

    switch (riskLevel.toLowerCase()) {
      case 'low risk':
        return 'risk-low';
      case 'medium risk':
        return 'risk-medium';
      case 'high risk':
        return 'risk-high';
      default:
        return 'risk-unknown';
    }
  }

  getRiskDot(riskLevel: string): string {
    if (!riskLevel) return '⚪';

    switch (riskLevel.toLowerCase()) {
      case 'low risk':
        return '🟢';
      case 'medium risk':
        return '🟠';
      case 'high risk':
        return '🔴';
      default:
        return '⚪';
    }
  }




  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      this.symbol = this.config.symbols[0]
      console.log(this.config)
      // this.fetchUpdatedprediton()
      // this.computeDriverImpacts();
    }
  }

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
    // this.fetchUpdatedAnalysis();
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
    // this.fetchUpdatedAnalysis();
  }
  isMacdSelected(macd: { fast: number; slow: number; signal: number }): boolean {
    const key = (m: any) => `${m.fast}-${m.slow}-${m.signal}`;
    return this.selectedMACD.some(m => key(m) === key(macd));
  }

  isNumber(value: any): boolean {
    return typeof value === 'number' && !isNaN(value);
  }
  getExchangeFromSymbol(symbol: string): string {
    if (symbol.endsWith('.NS')) return 'NSE (India)';
    if (symbol.endsWith('.TO')) return 'TSX (Canada)';
    if (symbol.endsWith('.L')) return 'LSE (UK)';
    if (symbol.endsWith('.T')) return 'TSE (Japan)';
    return 'NYSE / NASDAQ (US)';
  }



  //Rajat Ranjan 09-09-2025
  predict() {
    this.fetchUpdatedprediton();
    return
    if (!this.selectedPredictionDate) {
      alert("Please select a date before predicting.");
      return;
    }

    // You can call a service or emit an event here
    console.log("Predicting for date:", this.selectedPredictionDate);
    // this.fetchUpdatedprediton();

  }


  fetchUpdatedprediton() {
    this.loader.show();
    this.postService.preditionml(this.config).subscribe({
      next: (res: any) => {
        this.loader.hide();
        this.data = res.prediction.prediction;  // ✅ Extract the actual prediction data
        this.computeDriverImpacts();
        console.log(this.data);
      }
      ,
      error: (err) => {
        this.loader.hide();
        console.error(err);
        this.error = 'Prediction loading failed';
      }
    });
  }


  // Add this method in your Prediction component
  getArrowIcon(driver: string): string {
    return this.driverImpacts[driver] === 'up' ? '▲' : '▼';
  }

  getArrowClass(driver: string): string {
    return this.driverImpacts[driver] === 'up' ? 'green-arrow' : 'red-arrow';
  }

  computeDriverImpacts(): void {
    if (!this.data || !this.data.drivers) return;
    const basePrice = this.data.base || this.currentPrice || 0;
    this.driverImpacts['ema20'] = this.data.drivers.ema20 >= basePrice ? 'up' : 'down';
    this.driverImpacts['rsi14'] = this.data.drivers.rsi14 >= 50 ? 'up' : 'down';
  }


  onIntervalChange(interval: any) {
    this.selectedInterval = interval
    console.log(interval)
    this.config.range = this.selectedInterval.replace(/\s+/g, '');
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
          this.currentPrice = res.data[0].currentPrice;
          this.currency = res.data[0].currency
          this.lastUpdated =res.data[0].lastUpdated;
          this.cdref.detectChanges()
          this.getExchangeFromSymbol(res.data[0].symbol)
          this.fetchUpdatedprediton()
        }
      },
      error: (error) => {
        this.loader.hide()
        console.log(error)
      }
    })
  }

  saveCSV(): void {
    this.loader.show()
    const config = {
      symbols: this.config.symbols,
      range: this.config.range,
      reportType: 'technical',
      movingAverages: {
        SMA: this.selectedSMA,
        EMA: this.selectedEMA,
        RSI: this.selectedRSI,
        MACD: this.selectedMACD
      }
    };
    console.log(config)
    this.postService.anaylisi(config).subscribe({
      next: (res: any) => {
        this.loader.hide()
        console.log(res)
        const data = res?.data;
        if (!data || !data.historical || !data.indicators) {
          console.error('Invalid data format');
          return;
        }

        const historical = data.historical;
        const indicators = data.indicators;

        // Build dynamic headers
        const indicatorHeaders: string[] = [];
        this.selectedSMA.forEach(period => indicatorHeaders.push(`SMA${period}`));
        this.selectedEMA.forEach(period => indicatorHeaders.push(`EMA${period}`));
        this.selectedRSI.forEach(period => indicatorHeaders.push(`RSI${period}`));
        this.selectedMACD.forEach(macd => {
          const label = `${macd.fast},${macd.slow},${macd.signal}`;
          indicatorHeaders.push(
            `MACD(${label})`,
            `Signal(${label})`,
            `Histogram(${label})`
          );
        });
        const baseHeaders = ['Date', 'Open', 'High', 'Low', 'Close'];

        // Wrap headers that contain commas in double quotes
        const formattedIndicatorHeaders = indicatorHeaders.map(h =>
          h.includes(',') ? `"${h}"` : h
        );

        const headers = [...baseHeaders, ...formattedIndicatorHeaders];

        console.log("header", headers)
        const csvRows = [headers.join(',')];
        const safeValue = (val: any) =>
          typeof val === 'string' && val.includes(',') ? `"${val}"` : val ?? '';

        for (let i = 0; i < historical.length; i++) {
          const row = historical[i];
          const rowData: (string | number)[] = [
            new Date(row.date).toISOString(),
            row.open,
            row.high,
            row.low,
            row.close
          ];

          // Append indicators with value escaping
          this.selectedSMA.forEach(period => {
            rowData.push(safeValue(indicators[`SMA${period}`]?.[i]));
          });

          this.selectedEMA.forEach(period => {
            rowData.push(safeValue(indicators[`EMA${period}`]?.[i]));
          });

          this.selectedRSI.forEach(period => {
            rowData.push(safeValue(indicators[`RSI${period}`]?.[i]));
          });

          this.selectedMACD.forEach(macd => {
            const label = `MACD${macd.fast},${macd.slow},${macd.signal}`;
            const macdData = indicators[label]?.[i];

            rowData.push(
              safeValue(macdData?.MACD),
              safeValue(macdData?.signal),
              safeValue(macdData?.histogram)
            );
          });

          csvRows.push(rowData.join(','));
        }

        // Create CSV blob
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

        // Trigger download
        // Trigger download
        // const link = document.createElement('a');
        // link.href = URL.createObjectURL(blob);
        // link.download = `${data.symbol}_technical_data.csv`;
        // document.body.appendChild(link);
        // link.click();
        // document.body.removeChild(link);

      },
      error(err) {
        console.log(err)
      },
    })
  }


}
