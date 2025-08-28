import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';
import { LoaderService } from './service/loader'; // Adjust the import path as necessary
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const loaderService = new LoaderService(); // Create an instance of Loader service
  loaderService.show(); // Show loader before sending request
  // Show loader before sending request
  const token = localStorage.getItem('accessToken'); // Assuming the token is stored in localStorage
  if (token) {
    const clonedReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(clonedReq);
  }
  return next(req).pipe(
    finalize(() => {
      // Hide loader after response is received
      loaderService.hide();})
  );
};


