import { Routes } from '@angular/router';
import { LoginComponent } from './common/login/login';
import { Dashboard } from './dashboard/dashboard';

export const routes: Routes = [
    {path: '', redirectTo: '/login', pathMatch: 'full'},   
    {path: 'login', component: LoginComponent},
    {path:'dashboard', component:Dashboard}
];
