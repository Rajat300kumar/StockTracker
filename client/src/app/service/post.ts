import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class Post {
  constructor(private http: HttpClient) { }
  private apiUrl = 'http://localhost:3000/api';
  importCsv(selected: any[]) {
    console.log(selected)
    return this.http.post(`${this.apiUrl}/web_api/saveimportcsv`, { data: selected });
  }
  preditionml(pd: any) {
    console.log(pd)
    return this.http.post(`${this.apiUrl}/python/predict`, pd)
  }
  anaylisi(pd: object) {
    console.log(pd)
    return this.http.post(`${this.apiUrl}/stocks/anaylisis`, pd)
  }
  sentiment(pd: any) {
    console.log(pd)
    return this.http.post(`${this.apiUrl}/stocks/sentiments`, pd)
    // return this.http.post(`${this.apiUrl}/stocks/sentimentgoogle`,pd)
  }
  marketviewpost(pd: object) {
    console.log(pd)
    return this.http.post(`${this.apiUrl}/stocks/marketview`, pd)
  }
  report(pd: any) {
    console.log('pd', pd,)
    return this.http.post(`${this.apiUrl}/stocks/report`, pd)
  }
  getimportcsv(): Observable<any> {
    return this.http.get(`${this.apiUrl}/web_api/getimportcsv`);
  }
  getbulk(symbols: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/stocks/bulk`, { symbols });
  }
  // Example method to create a post
  createPost(postData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, postData);
  }
  // Example method to fetch posts
  getPosts(): Observable<any> {
    return this.http.get('https://jsonplaceholder.typicode.com/posts');
  }

}
