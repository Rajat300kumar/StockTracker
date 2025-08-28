import { inject, Injectable, signal } from '@angular/core';
import { LoaderService } from '../../service/loader';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  private _showText = signal(true);
 
  showText = this._showText.asReadonly();
   
  toggleText() {
    this._showText.update(show => !show);
  }
}
