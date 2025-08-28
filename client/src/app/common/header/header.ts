import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { routes } from '../../app.routes';
import { Router } from '@angular/router';
import { SidebarService } from '../side-menu/side-service';
@Component({
  selector: 'app-header',
  imports: [MatIcon, CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header {
@Input() title: string = 'Default Title';
  constructor( private router: Router,private sidebarService: SidebarService) {
    // You can initialize any properties or services here if needed
  } 

  toggleSidenav() {
    this.sidebarService.toggleText(); // Call the toggle method from SidebarService
  }
  logout() {
    // Implement logout functionality here
    this.router.navigate(['/login']); // Navigate to login page
    localStorage.removeItem('accessToken'); // Clear the token from localStorage
    
  } 
}
