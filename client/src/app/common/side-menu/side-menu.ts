import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, signal, Signal, ChangeDetectorRef, ChangeDetectionStrategy, effect } from '@angular/core';
import { SidebarService } from './side-service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
@Component({
  selector: 'app-side-menu',
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule, MatMenuModule],
  templateUrl: './side-menu.html',
  styleUrl: './side-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideMenu {
  showText: Signal<boolean>;
  selectedMenu: Signal<string | null> = signal(null); // Track selected menu
  open = '';
  menu = [
    {
      key: 'stocks',
      icon: 'work',
      label: 'Stocks',
      color: '#1976d2', // Blue
      submenus: [
        { key: 'view-all', icon: 'list', label: 'View All', color: '#1976d2' },
        { key: 'import-csv', icon: 'upload_file', label: 'Import From CSV', color: '#1976d2' },
      ]
    },
    {
      key: 'reports',
      icon: 'description',
      label: 'Reports',
      color: '#e91e63', // Pink
      submenus: [
        { key: 'day', icon: 'calendar_today', label: 'Day', color: '#e91e63' },
        { key: 'monthly', icon: 'date_range', label: 'Monthly', color: '#e91e63' },
        { key: 'year', icon: 'insert_chart', label: 'Annual', color: '#e91e63' },
      ]
    },
    {
      key: 'analysis',
      icon: 'psychology',
      label: 'Analysis',
      color: '#4caf50', // Green
      submenus: [
        { key: 'price', icon: 'show_chart', label: 'Price Trends', color: '#4caf50' },
        { key: 'volume', icon: 'bar_chart', label: 'Volume Analysis', color: '#4caf50' },
        { key: 'technical', icon: 'functions', label: 'Technical Indicators', color: '#4caf50' },
        { key: 'sentiment', icon: 'chat', label: 'Sentiment Analysis', color: '#4caf50' },
      ]
    },
    {
      key: 'overview',
      icon: 'public',
      label: 'Market Overview',
      color: '#ff9800', // Orange
      submenus: [
        // { key: 'IN', icon: 'flag', label: 'India', color: '#ff9800' },
        { key: 'US', icon: 'flag', label: 'USA', color: '#ff9800' },
        // { key: 'CN', icon: 'flag', label: 'China', color: '#ff9800' },
      ]
    },
    {
      key: 'Prediction',
      icon: 'auto_graph',
      label: 'Prediction',
      color: '#9c27b0', // Purple
      submenus: [
        { key: 'Predictstock', icon: 'trending_up', label: 'Predict Stock Price', color: '#9c27b0' },
        { key: 'PredictHistorical', icon: 'history', label: 'Historical Comparison', color: '#9c27b0' },
        { key: 'PredictConfidence', icon: 'track_changes', label: 'Confidence Score', color: '#9c27b0' },
      ]
    }
  ];


  // menu = [
  //   {
  //     key: 'stocks',
  //     icon: '💼', // Better fits a "stock portfolio"
  //     label: 'Stocks',
  //     submenus: [
  //       { key: 'view-all', icon: '📋', label: 'View All' },
  //       // { key: 'add-new', icon: '➕', label: 'Add New' },
  //       { key: 'import-csv', icon: '📤', label: 'Import From CSV' },
  //       // { key: 'export-csv', icon: '📥', label: 'Export To CSV' },
  //     ]
  //   },
  //   {
  //     key: 'reports',
  //     icon: '📑', // Reports/documents feel
  //     label: 'Reports',
  //     submenus: [
  //       { key: 'day', icon: '📆', label: 'Day' },
  //       { key: 'monthly', icon: '🗓️', label: 'Monthly' },
  //       { key: 'year', icon: '📊', label: 'Annual' },
  //     ]
  //   },
  //   {
  //     key: 'analysis',
  //     icon: '🧠', // Analysis/AI/Insight
  //     label: 'Analysis',
  //     submenus: [
  //       { key: 'price', icon: '📈', label: 'Price Trends' },
  //       { key: 'volume', icon: '📊', label: 'Volume Analysis' },
  //       { key: 'technical', icon: '🧮', label: 'Technical Indicators' },
  //       { key: 'sentiment', icon: '💬', label: 'Sentiment Analysis' },
  //     ]
  //   },
  //   {
  //     key: 'overview',
  //     icon: '🌐', // Global market overview
  //     label: 'Market Overview',
  //     submenus: [
  //       { key: 'IN', icon: '🇮🇳', label: 'India' },
  //       { key: 'US', icon: '🇺🇸', label: 'USA' },
  //       { key: 'CN', icon: '🇨🇳', label: 'China' },
  //     ]
  //   },
  //   {
  //     key: 'Prediction',
  //     icon: '🔮', // Global/overview icon
  //     label: 'Prediction',
  //     submenus: [
  //       { key: 'Predictstock', icon: '📈', label: 'Predict Stock Price' },
  //       { key: 'PredictHistorical', icon: '🕰️', label: 'Historical Comparison' },
  //       { key: 'PredictConfidence', icon: '🎯', label: 'Confidence Score' },
  //     ]
  //   }
  // ];

  selectedSubmenu!: string;
  constructor(public sidebarService: SidebarService, private cdref: ChangeDetectorRef) {
    this.showText = this.sidebarService.showText;
    this.selectedMenu = this.sidebarService.selectedMenu;

    // ✅ Use effect here, not in ngOnInit
    effect(() => {
      const selectedMenu = this.sidebarService.selectedMenu();
      if (selectedMenu) {
        this.open = selectedMenu;
        this.cdref.markForCheck(); // ✅ Trigger re-render
      }
    });
  }

  openMenu = signal<string | null>(null); // Track which submenu is open
  @Output() menuSelected = new EventEmitter<string>(); // Emit selected menu

  selectSubmenu(menu: string, event: MouseEvent) {
    console.log('Submenu selected:', menu);
    event.stopPropagation(); // Prevent bubbling if needed
    setTimeout(() => {
      this.selectedSubmenu = menu;
      this.menuSelected.emit(menu);
    }, 0);
  }

  onMenuSelect(menuKey: string) {
    console.log("Menu selected:", menuKey);
    if (this.openMenu() === menuKey) {
      this.openMenu.set(null); // Close if already open
    } else {
      this.openMenu.set(menuKey); // Open the selected menu
    }
    // Emit event for parent component
    this.menuSelected.emit(menuKey);
    // Update selected menu in service
    this.sidebarService.setSelectedMenu(menuKey);
    this.cdref.detectChanges()
  }

  toggleMenu(menu: string) {
    console.log("Toggling menu:", menu);
    const currentMenu = this.open;

    // Auto-open menu if it matches the selected one
    if (this.selectedMenu() === menu) {
      this.open = menu;
    } else {
      this.open = currentMenu === menu ? '' : menu;
    }
  }





  toggleText() {
    this.sidebarService.toggleText();
  }

  ngOnChanges(): void {
    this.selectedMenu = this.sidebarService.selectedMenu;
    console.log("Selected menu in side menu", this.selectedMenu());
    this.cdref.detectChanges()
  }
}


