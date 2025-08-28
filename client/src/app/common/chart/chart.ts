import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ChartType,
  NgApexchartsModule,
  ApexAxisChartSeries,
  ApexOptions
} from 'ng-apexcharts';

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-chart',
  standalone: true, // ✅ Required if you're using standalone components
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './chart.html',
  styleUrls: ['./chart.css'],// ✅ must be 'styleUrls' (plural)
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ChartComponent implements OnChanges { // ✅ use PascalCase naming

  @Input() chartType: ChartType = 'line';

  @Input() config: {
    series: ApexAxisChartSeries;
    options: Partial<ApexOptions>;
  } = { series: [], options: {} };

  chartSeries: ApexAxisChartSeries = [];
  chartOptions: Partial<ApexOptions> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      this.chartSeries = this.config.series || [];
      this.chartOptions = this.config.options || {};
    }
  }
}
