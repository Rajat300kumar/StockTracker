import { Component, inject, OnInit, signal } from '@angular/core';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  FormControl,
  FormGroupDirective,
  NgForm,
  Validators,
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
} from '@angular/forms';
import { Post } from '../../service/post';
import { Router } from '@angular/router';
import { LoaderService } from '../../service/loader';
export class MyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
  }
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatTabsModule,
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    MatCheckboxModule,

  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class LoginComponent implements OnInit {
  loader= inject(LoaderService)
  constructor(private postService: Post, private router: Router) { }
  ngOnInit(): void {
    console.log('LoginComponent initialized');

    // Any initialization logic can go here.
    // For example, you could reset the form or perform authentication checks.
    this.loginForm.reset();
  }
  matcher = new MyErrorStateMatcher();
  hide = signal(true);
  emailFormControl = new FormControl('', [Validators.required, Validators.email]) || 'user@123gmail.com';
  loginForm = new FormGroup({
    email: this.emailFormControl,
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });

  clickEvent(event: MouseEvent) {
    this.hide.set(!this.hide());
    event.stopPropagation();
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.loader.show()
      this.postService.createPost(this.loginForm.value).subscribe(res => {
        this.loader.hide()

        // Handle successful login, e.g., store token, redirect, etc.   
        this.router.navigate(['/dashboard']);
      }, error => {
        this.router.navigate(['/login']);

      });
    } else {
      console.log('Form is invalid');
    }
  }
}