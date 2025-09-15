import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, inject, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTable, MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatIcon } from '@angular/material/icon';
import { SelectionModel } from '@angular/cdk/collections';
import { MatCheckbox } from '@angular/material/checkbox';
import { Post } from '../service/post';
/**
 * @title Dialog with header, scrollable content and actions
 */
@Component({
    selector: 'app-stock-all-csv',
    standalone: true,
    imports: [MatButtonModule, MatDialogModule, MatTableModule, CommonModule, MatIcon, MatCheckbox],
    template: `
    <div class="stock-info-headerbglight" style='display: flex; justify-content: space-between; align-items: center;'>
   <h1 mat-dialog-title>{{ data?.title || 'Import CSV' }}</h1>
   <input matInput placeholder="Search" (input)="dataSource.filter = $event.target.value.trim().toLowerCase()" style="width: 200px; margin-right: 10px;">
    <button mat-icon-button (click)="importdata()" style="color:blue;">
        <mat-icon>save</mat-icon>
    </button>
    <button mat-icon-button (click)="closeDialog()" style="color:red;">
        <mat-icon>close</mat-icon>
    </button>
</div>
    <div mat-dialog-content style="display:none;">
        <p *ngIf="!data?.data || data.data.length === 0">
            No data available to display.
        </p>
        <p *ngIf="data?.data && data.data.length > 0">
            Displaying {{ data.data.length }} records.
        </p>
        <p *ngIf="data?.data && data.data.length > 0">
            <strong>Data Preview:</strong>
        </p>
        <p *ngIf="data?.data && data.data.length > 0">          
            The table below shows the imported CSV data.
        </p>
    </div>
        

    <div class="mat-elevation-z2 table-container">
    <table mat-table [dataSource]="dataSource" class="mat-table">

        <!-- Handle all columns dynamically -->
        <ng-container *ngFor="let column of displayedColumns" [matColumnDef]="column">

            <!-- Special case for 'select' column -->
            <ng-container *ngIf="column === 'select'; else defaultColumn">
            <th mat-header-cell *matHeaderCellDef>
                <mat-checkbox
                (change)="$event ? masterToggle() : null"
                [checked]="isAllSelected()"
                [indeterminate]="selection.hasValue() && !isAllSelected()">
                </mat-checkbox>
            </th>
            <td mat-cell *matCellDef="let row">
                <mat-checkbox
                (click)="$event.stopPropagation()"
                (change)="$event ? selection.toggle(row) : null"
                [checked]="selection.isSelected(row)">
                </mat-checkbox>
            </td>
            </ng-container>

            <!-- Default columns -->
            <ng-template #defaultColumn>
            <th mat-header-cell *matHeaderCellDef> {{ column }} </th>
            <td mat-cell *matCellDef="let row"> {{ row[column] }} </td>
            </ng-template>

        </ng-container>

        <!-- Rows -->
        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

    </table>

    </div>
    `,
    styles: `
        .stock-info-headerbglight {
    padding: 1rem;
    background-color: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    margin-bottom: 1rem;
}
        .table-container {
        overflow: auto;
        max-height: 800px; /* Adjust height as needed */
        background-color: #fff;
        padding: 12px;
        border-radius: 8px;
        }

        .mat-table {
        width: 100%;
        font-size: 13px;
        border-spacing: 0;
        }

        .mat-header-cell, .mat-cell {
        padding: 12px 8px;
        text-align: left;
        border-bottom: 1px solid #e0e0e0;
        }

        .mat-header-cell {
        font-weight: 600;
        background-color: #f5f5f5;
        }

        .mat-row:hover {
        background-color: #f9f9f9;
        }

    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockAllc {
    displayedColumns: string[] = ["select","SYMBOL", "NAME OF COMPANY", "SERIES", "DATE OF LISTING", "PAID UP VALUE", "MARKET LOT", "ISIN NUMBER", "FACE VALUE", "Ticker", "YahooEquiv",];
    dialog: any;
    dataSource = new MatTableDataSource<any>();
    selection = new SelectionModel<any>(true, []);
    @ViewChild(MatTable) table!: MatTable<any>;

    constructor(@Inject(MAT_DIALOG_DATA) public data: any, private dialogRef: MatDialogRef<StockAllc>,private serice: Post) {
        this.dataSource.data = data?.data || [];
    }
    importdata() {
        this.serice.importCsv(this.selection.selected).subscribe((response: any) => {
            if (response && response.message === 'Done') {
                this.dialogRef.close(response); // Close the dialog and pass the response
            } else {
                console.error('CSV import failed:', response);
            }
        }, (error: any) => {
            this.dialogRef.close(null); // Close the dialog on error
        });

        
    }
    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const numRows = this.dataSource.data.length;
        return numSelected === numRows;
    }

    masterToggle() {
        this.isAllSelected()
            ? this.selection.clear()
            : this.dataSource.data.forEach((row: any) => this.selection.select(row));
    }

    ngOnInit() {
        if (this.data && this.data.data) {
            this.dataSource.data = this.data.data;
        }
    }
    ngAfterViewInit() {
        // Ensure data update is detected after view init
        if (this.table) {
            this.table.renderRows();
        }
    }

    closeDialog() {
        this.dialogRef.close();

    }
}

