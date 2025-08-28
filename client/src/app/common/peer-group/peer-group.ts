import { Component } from '@angular/core';
import { Post } from '../../service/post';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-peer-group',
  imports: [CommonModule],
  templateUrl: './peer-group.html',
  styleUrl: './peer-group.css'
})
export class PeerGroup {
symbol = "SAIA";  // can be dynamic
  company: any;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get(`/api/stocks/company/${this.symbol}`)
      .subscribe(data => {
        this.company = data;
        console.log(this.company)
      });
  }
}
