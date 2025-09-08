import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, NgZone, ChangeDetectionStrategy, inject } from '@angular/core';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef } from 'ag-grid-community';
import { filter } from 'rxjs';
import { StockNavigationService } from './stock-navigation.service';
import { CellMenu } from '../cell-menu/cell-menu';

export interface GridConfig {
  columnDefs: any[];
  rowData: any[];
  defaultColDef?: any;
  rowSelection?: { type: 'single' | 'multiple' }; // 👈 updated
  onGridReady?: (params: any) => void;
}


@Component({
  selector: 'app-ag-grid',
  standalone: true,  // ✅ if you're using standalone component
  imports: [AgGridModule],
  templateUrl: './ag-grid.html',
  styleUrl: './ag-grid.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgGrid implements OnInit, OnChanges {
  @Input() config: GridConfig | undefined;
  @Input() rowSelection: 'single' | 'multiple' = 'single';
  stockNavigationService = inject(StockNavigationService);

  columnDefs: any[] = [];
  rowData: any[] = [];
  defaultColDef = {
    minWidth: 120,
    filter: true,
    sortable: true,
    resizable: true,
    floatingFilter: true
  };
  gridApi: any;
  constructor(private cdref: ChangeDetectorRef,
    private ngZone: NgZone) { }
  onGridReady(params: any) {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      // Copy the columnDefs
      const baseColumns = this.config.columnDefs || [];

      // Add "Review" column if not already present
      const reviewColumnExists = baseColumns.some(col => col.field === 'review');
      const reviewColumn: ColDef = {
        headerName: 'Review',
        field: 'review',
        pinned: 'right',
        cellRenderer: CellMenu,  // ✅ Use the Angular component
        width: 70,
        maxWidth: 90,
        sortable: false,
        filter: false
      };

      // Append Review column if needed
      this.columnDefs = reviewColumnExists ? baseColumns : [...baseColumns, reviewColumn];
      this.rowData = this.config.rowData || [];

      setTimeout(() => {
        setTimeout(() => {
          this.gridApi?.sizeColumnsToFit();
          this.cdref.markForCheck(); // lighter than detectChanges()
        }, 0);
      });
    }
  }

  ngOnChanges_(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      this.columnDefs = this.config.columnDefs || [];
      this.rowData = this.config.rowData || [];
      // Trigger sizeColumnsToFit after view updates:
      setTimeout(() => {
        setTimeout(() => {
          this.gridApi?.sizeColumnsToFit();
          this.cdref.markForCheck(); // lighter than detectChanges()
        }, 0);

      });
    }
  }

  ngOnInit(): void {
  }

  // ngOnChanges(changes: SimpleChanges): void {
  //   console.log('AgGrid changes detected:', changes);
  //   if (changes['config'] && this.config) {
  //     this.columnDefs = this.config.columnDefs || [];
  //     this.rowData = this.config.rowData || [];
  //   }
  // }

  // onGridReady(params: any) {
  //   params.api.sizeColumnsToFit();
  // }

  onSelectionChanged(params: any) {
    const selectedRows = params.api.getSelectedRows();
  }

  onCellClicked(params: any) {
    console.log('Cell clicked:', params);
  }

  onRowDoubleClicked(params: any) {
    console.log('Row double clicked:', params);
  }
}


