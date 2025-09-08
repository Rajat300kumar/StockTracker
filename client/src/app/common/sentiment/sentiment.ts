import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, SimpleChanges } from '@angular/core';
import { error } from 'jquery';
import { LoaderService } from '../../service/loader';
import { Post } from '../../service/post';
export interface SentimentConfig {
  symbols: string[];
  range: string;
  reportType: string;
}

@Component({
  selector: 'app-sentiment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sentiment.html',
  styleUrl: './sentiment.css'
})
export class Sentiment {
  @Input() stockSymbol!: string;
  @Input() range: '1W' | '1M' | '3M' = '1M';
  intervals: string[] = ['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y', 'MAX'];
  selectedInterval: string = '6M'; // Default interval
  @Input() config !: SentimentConfig;
  sentimentData: any


  constructor(private cdref: ChangeDetectorRef, private loader: LoaderService, private postService: Post) { }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      this.selectedInterval = this.config.range
      this.fetchSentimentData(this.config);
    }
  }

  onIntervalChange(interval: any) {
    this.selectedInterval = interval
    // TODO: Fetch or filter chart data by interval
    console.log('Interval changed:', this.selectedInterval);
    this.fetchSentimentData(this.config)
    // Example: you could call your data filtering logic here
  }

  fetchSentimentData(item: any) {
    console.log(item)
    this.loader.show()
    var pd = { 'symbol': item?.symbols, "range": this.selectedInterval, "reportType": item.reportType }
    console.log("pd", pd)
    this.postService.sentiment(this.config).subscribe({
      next: (res: any) => {
        this.loader.hide()
        console.log(res)

        // 👇 Transform response into the format the template expects
        this.sentimentData = {
          score: res.overallSentimentScore || 0,
          sources: res.articles?.length || 0,
          negative: res.articles?.filter((a: any) => a.sentiment?.score < 0).length || 0,
          positive: res.articles?.filter((a: any) => a.sentiment?.score > 0).length || 0,
          neutral: res.articles?.filter((a: any) => a.sentiment?.score === 0).length || 0,
          headlines: res.articles?.map((a: any) => ({
            score: a.sentiment?.score || 0,
            text: a.title || 'Untitled',
          })) || [],
        };

        // Optional: Update range and symbol for display
        this.range = res.range || this.selectedInterval;
        this.stockSymbol = res.symbol || item?.symbols || 'N/A';
        this.cdref.detectChanges()
      }, error: (err: any) => {
        this.loader.hide()
        console.log(err)
      }
    })

    // 🔥 Call your API here
    // e.g. fetch or HttpClient request
  }
}
