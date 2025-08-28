import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, signal, Signal, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { SidebarService } from './side-service';

@Component({
  selector: 'app-side-menu',
  imports: [CommonModule],
  templateUrl: './side-menu.html',
  styleUrl: './side-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideMenu {
  showText: Signal<boolean>;
  open = '';
  menu = [
    {
      key: 'stocks',
      icon: '💼', // Better fits a "stock portfolio"
      label: 'Stocks',
      submenus: [
        { key: 'view-all', icon: '📋', label: 'View All' },
        { key: 'add-new', icon: '➕', label: 'Add New' },
        { key: 'import-csv', icon: '📤', label: 'Import From CSV' },
        { key: 'export-csv', icon: '📥', label: 'Export To CSV' },
      ]
    },
    {
      key: 'reports',
      icon: '📑', // Reports/documents feel
      label: 'Reports',
      submenus: [
        { key: 'day', icon: '📆', label: 'Day' },
        { key: 'monthly', icon: '🗓️', label: 'Monthly' },
        { key: 'year', icon: '📊', label: 'Annual' },
      ]
    },
    {
      key: 'analysis',
      icon: '🧠', // Analysis/AI/Insight
      label: 'Analysis',
      submenus: [
        { key: 'price', icon: '📈', label: 'Price Trends' },
        { key: 'volume', icon: '📊', label: 'Volume Analysis' },
        { key: 'technical', icon: '🧮', label: 'Technical Indicators' },
        { key: 'sentiment', icon: '💬', label: 'Sentiment Analysis' },
      ]
    },
    {
      key: 'overview',
      icon: '🌐', // Global market overview
      label: 'Market Overview',
      submenus: [
        { key: 'IN', icon: '🇮🇳', label: 'India' },
        { key: 'US', icon: '🇺🇸', label: 'USA' },
        { key: 'CN', icon: '🇨🇳', label: 'China' },
      ]
    },
    {
      key: 'Prediction',
      icon: '🔮', // Global/overview icon
      label: 'Prediction',
      submenus: [
        { key: 'Predictstock', icon: '📈', label: 'Predict Stock Price' },
        { key: 'PredictHistorical', icon: '🕰️', label: 'Historical Comparison' },
        { key: 'PredictConfidence', icon: '🎯', label: 'Confidence Score' },
      ]
    }
  ];

  selectedSubmenu!: string;
  constructor(public sidebarService: SidebarService, private cdref: ChangeDetectorRef) { this.showText = this.sidebarService.showText; }

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

  toggleSubmenu(menu: string) {
    this.openMenu.set(this.openMenu() === menu ? null : menu);
  }


  toggleMenu(menu: string) {
    this.open = this.open === menu ? '' : menu;
  }
  toggleText() {
    this.sidebarService.toggleText();
  }
}
