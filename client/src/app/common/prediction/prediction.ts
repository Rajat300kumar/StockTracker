import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, input, OnChanges, SimpleChanges } from '@angular/core';
import { LoaderService } from '../../service/loader';
import { Post } from '../../service/post';
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
  imports: [CommonModule],
  templateUrl: './prediction.html',
  styleUrl: './prediction.css'
})
export class Prediction implements OnChanges {
  @Input() config!: pridection
  stockSymbol = 'TCS.NS';
  intervals: string[] = ['1 D', '5 D', '1 M', '6 M', 'YTD', '1 Y', '5 Y', 'MAX'];
  constructor(private cdref: ChangeDetectorRef, private loader: LoaderService, private postService: Post) { }

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
    stock: "TCS",
    interval: "1M",
    predictedClose: 3420.65,
    predictionDate: "2025-08-12",
    confidence: 87,
    riskLevel: "Low Risk",
    trainedDate: "Aug 10, 2025",
    best: 3450,
    base: 3420,
    worst: 3390,
    backtestAccuracy: 93.2,
    yahooAccuracy: 86.4,
    smaAccuracy: 78.9,
    drivers: {
      ema20: 3422.15,
      rsi14: 58.2,
      sentiment: "Positive"
    },
    riskFactors: [
      "Volatility: High (±1.8% daily)",
      "Earnings report due in 3 days"
    ],
    history: [
      { date: "Aug 08, 25", predicted: "₹3410.25", actual: "₹3408.10", error: "0.06%" },
      { date: "Aug 09, 25", predicted: "₹3415.20", actual: "₹3418.00", error: "-0.08%" },
    ]
  };


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      this.symbol = this.config.symbols[0]
      console.log(this.config)
      this.fetchUpdatedprediton()
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
  
  fetchUpdatedprediton() {
    // this.loader.show()
    console.log(this.config)
    // this.postService.preditionml(this.config).subscribe({
    //   next: (res: any) => {
    //     this.loader.hide()
    //     console.log(res)
    //   },
    //   error(err) {
    //     console.log(err)
    //   },
    // })
  }

  onIntervalChange(interval: any) {
    this.selectedInterval = interval
    console.log(interval)
    this.config.range = this.selectedInterval.replace(/\s+/g, '');
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
