import { ChangeDetectorRef, Component, inject, Input, input, NgZone, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Header } from '../common/header/header';
import { SideMenu } from '../common/side-menu/side-menu';
import { HttpClient } from '@angular/common/http';
import { finalize, map } from 'rxjs/operators';
import { StockAllc } from './StockAllcsv';
import { MatDialog } from '@angular/material/dialog';
import { data, error } from 'jquery';
import { AgGrid, GridConfig } from '../common/ag-grid/ag-grid';
import { Post } from '../service/post';
import { StockChart, StockConfig, StockMeta } from '../common/stock-chart/stock-chart'
import { CommonModule, CurrencyPipe } from '@angular/common';
import { overview, Overview } from '../common/overview/overview';
import { Analysis, AnalysisConfig } from '../common/analysis/analysis';
import { LoaderService } from '../service/loader';
import { Sentiment, SentimentConfig } from '../common/sentiment/sentiment';
import { Prediction, pridection } from '../common/prediction/prediction';
import { StockNavigationService } from '../common/ag-grid/stock-navigation.service';
// import { PeerGroup } from '../common/peer-group/peer-group';
@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, Header, SideMenu, AgGrid, StockChart, Overview, Analysis, Sentiment, Prediction],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  title: string = 'StockTracker';
  jsonData: any[] = []; // Array to hold the JSON data
  symbol: string[] = [];
  selectedMenu = 'view-all';
  stockConfig!: StockConfig
  loader = inject(LoaderService)
  // stockchart!: StockMeta;


  constructor(private http: HttpClient, private dialog: MatDialog, private postService: Post, private cdref: ChangeDetectorRef, private ngZone: NgZone,private stockNav: StockNavigationService) {
    // You can initialize any properties or services here if needed
  }

  @Input()
  config!: GridConfig;  // ✅ Correct name that matches `[config]="..."`

  allStrock: GridConfig = {
    columnDefs: [],
    rowData: [],
    //defaultColDef:this.defaultColDef,
    rowSelection: { type: 'multiple' }, // Allow multiple row selection
  };
  market: overview = {
    region: 'IN',
    count: 12,
    action: 'day_gainers'
  }
  analysis: AnalysisConfig = {
    symbols: this.symbol,        // make sure this.symbol is a string[] (like ['TCS'])
    range: '1D',
    reportType: "price",
    movingAverages: {}
  }
  sentiment: SentimentConfig = {
    symbols: this.symbol,        // make sure this.symbol is a string[] (like ['TCS'])
    range: '1M',
    reportType: "sentiment",
  }
  pridectionconfig: pridection = {
    symbols: this.symbol,        // make sure this.symbol is a string[] (like ['TCS'])
    range: '1D',
    reportType: "Predictstock",
  }

  toTitleCase(text: string): string {
    return text
      .replace(/([A-Z])/g, ' $1')       // Add space before capital letters
      .replace(/\./g, ' ')              // Replace dots with space (for nested keys)
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim();
  }
  formatMarketCap(value: number, currency: string): string {
    if (!value) return '-';

    let suffix = '';
    let divisor = 1;

    if (value >= 1_000_000_000_000) {
      suffix = 'Tn';
      divisor = 1_000_000_000_000;
    } else if (value >= 1_000_000_000) {
      suffix = 'Bn';
      divisor = 1_000_000_000;
    } else if (value >= 1_000_000) {
      suffix = 'Mn';
      divisor = 1_000_000;
    }

    const formatted = (value / divisor).toFixed(2);
    return `${formatted} ${suffix}`;
  }

  currencySymbolMap: { [key: string]: string } = {
    USD: '$',
    INR: '₹',
    GBP: '£',
    EUR: '€',
    JPY: '¥',
    // add more as needed
  };

  selectedColumns: string[] = ['symbol', 'shortName', 'financialCurrency', 'regularMarketDayRange.low', 'regularMarketPrice', 'regularMarketDayRange.high', 'marketCap', 'exchangeTimezoneName', 'marketState', 'fullExchangeName', 'regularMarketOpen', 'quoteType']; // can load from localStorage or user settings

  getseletedstockslive(symbols: string[]) {
    console.log("symble", symbols)
    this.loader.show()
    this.postService.getbulk(symbols).subscribe(
      (data: any) => {
        this.loader.hide()
        const columnDefMap = new Map(
          data.columnDefs.map((col: any) => [col.field, col])
        );

        const finalColumnDefs = this.selectedColumns.map(field => {
          // Handle nested field: regularMarketDayRange.low
          if (field === 'regularMarketDayRange.low') {
            return {
              headerName: 'Day Low',
              field: 'dayLow', // this is a virtual/derived field name
              valueGetter: (params: any) => {
                const low = params.data?.regularMarketDayRange?.low;
                return low;
              },
              valueFormatter: (params: any) => {
                const symbol = this.currencySymbolMap[params.data?.financialCurrency] ?? params.data?.financialCurrency ?? '';
                return params.value != null ? `${symbol}${params.value.toFixed(2)}` : '';
              },
              cellStyle: (params: any) => {
                const open = params.data?.regularMarketOpen;
                const low = params.data?.regularMarketDayRange?.low;
                if (low == null || open == null) return {};
                return {
                  color: low >= open ? 'green' : 'red',
                  fontWeight: 'bold'
                };
              },
            };
          }


          // Handle nested field: regularMarketDayRange.high
          if (field === 'regularMarketDayRange.high') {
            return {
              headerName: 'Day High',
              field: 'dayHigh',
              valueGetter: (params: any) => params.data?.regularMarketDayRange?.high,
              valueFormatter: (params: any) => {
                const value = params.value;
                const symbol = this.currencySymbolMap[params.data?.financialCurrency] ?? params.data?.financialCurrency ?? '';
                return value != null ? `${symbol}${value.toFixed(2)}` : '';
              },
              cellStyle: (params: any) => {
                const open = params.data?.regularMarketOpen;
                const high = params.data?.regularMarketDayRange?.high;
                if (high == null || open == null) return {};
                return {
                  color: high >= open ? 'green' : 'red',
                  fontWeight: 'bold'
                };
              }
            };
          }
          if (field === 'regularMarketPrice') {
            return {
              headerName: 'Market Price',
              field: 'regularMarketPrice',
              valueFormatter: (params: any) => {
                const value = params.value;
                const symbol = this.currencySymbolMap[params.data?.financialCurrency] ?? params.data?.financialCurrency ?? '';

                return value != null ? `${symbol}${value.toFixed(2)}` : '';
              },
              cellStyle: (params: any) => {
                const price = params.value;
                const open = params.data?.regularMarketOpen;
                if (price == null || open == null) return {};
                return {
                  color: price >= open ? 'green' : 'red',
                  fontWeight: 'bold'
                };
              }
            };
          }


          if (field === 'marketCap') {
            return {
              field,
              headerName: 'Market Cap',
              valueFormatter: (params: { value: any; data: { financialCurrency: any; }; }) => this.formatMarketCap(params.value, params.data?.financialCurrency),
            }
          }



          // Regular flat fields
          const colDefFromServer = columnDefMap.get(field);
          if (!colDefFromServer) return null;

          return {
            ...colDefFromServer,
            headerName: this.toTitleCase(field)
          };
        }).filter(Boolean); // Remove nulls

        const flattenedRowData = data.rowData.map((row: any) => {
          const newRow: any = {};

          this.selectedColumns.forEach(field => {
            if (field === 'regularMarketDayRange.low') return; // skip, handled by valueGetter
            if (field === 'regularMarketDayRange.high') return;
            newRow[field] = row[field];
          });

          // keep original nested object for valueGetter
          newRow['regularMarketDayRange'] = row['regularMarketDayRange'];
          newRow['regularMarketOpen'] = row['regularMarketOpen']; // required for coloring

          return newRow;
        });

        // Update the AG Grid config
        this.allStrock = {
          ...this.allStrock,
          columnDefs: finalColumnDefs,
          rowData: flattenedRowData
        };
        this.cdref.detectChanges()
        console.log('Selected stocks live data:', this.allStrock)
      },
      error => {
        this.loader.hide()
        console.error('Error fetching selected stocks:', error);
      }
    );
  }

  getseletedstocks() {
    this.loader.show()
    // Example of fetching all stocks data
    this.postService.getimportcsv().subscribe((data: any) => {
      console.log("data", data)
      this.loader.hide()
      this.symbol = []; // ✅ Clear the array before adding new data
      data.forEach((item: any) => {
        this.symbol.push(item.YahooEquiv); // Assuming each item has a 'symbol' property
      });
      console.log(this.symbol)
      this.getseletedstockslive(this.symbol); // Fetch live data after getting all stocks
    }, error => {
      this.loader.hide()

      console.error('Error fetching all stocks:', error);
    });
  }
  onMenuSelect(menu: string) {
    this.ngZone.run(() => {
      this.selectedMenu = menu;
      if (menu === 'import-csv') {
        let dialogRef = this.dialog.open(StockAllc, {
          height: '800px',
          width: '1200px',
          data: { data: this.jsonData } // Pass the JSON data to the dialog
        });
        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            console.log('Dialog closed with result:', result);
            this.getseletedstocks(); // Refresh the stock data after dialog closes
          } else {
            console.log('Dialog closed without result');
          }
        });
      } else if (menu === 'view-all') {
        console.log("this.symble", this.symbol)
        this.getseletedstockslive(this.symbol);
      } else if (menu === 'day' || menu === 'monthly' || menu === 'year') {
        this.stockConfig = {
          symbols: this.symbol,        // make sure this.symbol is a string[] (like ['TCS'])
          range: '1wk',
          reportType: menu,           // not 'day-report' if your backend expects 'day'
          metrics: ['open', 'high', 'low', 'close', 'volume'],
          chartType: 'bar'             // or whatever chart type you're using
        };
      } else if (menu === "IN" || menu === "US" || menu === "CN") {
        this.market = {
          ...this.market,
          region: menu,
          count: 12,
          action: 'day_gainers'
        }
      } else if (menu === 'price' || menu === 'volume' || menu === 'technical') {
        console.log("Anylisys", menu)
        this.analysis = {
          ...this.analysis,
          symbols: this.symbol,
          range: this.analysis.range,
          reportType: menu as any,
          movingAverages: { SMA: [7] }
        }
      } else if (menu === 'sentiment') {
        console.log("Anylisys", menu)
        this.sentiment = {
          ...this.sentiment,
          symbols: this.symbol,
          range: this.sentiment.range,
          reportType: menu as any,
        }
      } else if (menu === 'Predictstock' || menu === 'PredictHistorical' || menu == 'PredictConfidence') {
        console.log("Prediction", menu)
        this.pridectionconfig = {
          ...this.pridectionconfig,
          symbols: this.symbol,
          range: this.pridectionconfig.range,
          reportType: menu as any,
        }
      }
      this.cdref.detectChanges();
    });
  }

  ngOnInit(): void {
    // Example of loading data when the component initializes
    this.getseletedstocks(); // Fetch all stocks data on initialization
    this.loadData();

  }

  async loadData() {
    // Example: Fetching a CSV file or any other data source      
    this.http.get('assets/Ticker_List_NSE_India.csv', { responseType: 'text' }).pipe(
      map(response => {
        const rst = this.csvtojson(response) // Example of parsing CSV into an array
        return rst; // Return the parsed JSON data
      }),

    ).subscribe((data: any) => {
      this.jsonData = data; // Assuming jsonData is a property in your component to hold the data
    }, error => {
      console.error('Error loading data:', error);
    });
  }
  csvtojson(csv: string) {
    var lines = csv.trim().split('\n');
    var headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '')); // Trim headers and remove quotes
    return lines.splice(1).map(line => {
      var values = line.split(',').map(v => v.trim().replace(/^"|"$/g, '')); // Trim values and remove quotes
      values.pop(); // Remove the last value if it's empty (for trailing commas)
      var obj: any = {};
      headers.forEach((key, ind) => {
        if (key === '') key = 'Ticker'; // Handle empty headers 
        obj[key] = values[ind];
      });
      return obj;
    });

  }

}
