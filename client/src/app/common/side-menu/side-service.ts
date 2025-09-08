import { inject, Injectable, signal } from '@angular/core';
import { LoaderService } from '../../service/loader';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  private _showText = signal(true);
 private _selectedMenu = signal<string | null>(null);  // NEW SIGNAL
  selectedMenu = this._selectedMenu.asReadonly();       // FOR COMPONENT TO READ
  showText = this._showText.asReadonly();
   
  toggleText() {
    console.log("Toggling sidebar text");
    this._showText.update(show => !show);
  }
  setSelectedMenu(menu: string) {
    console.log("Setting selected menu:", menu);
    this._selectedMenu.set(menu);
  }
}
