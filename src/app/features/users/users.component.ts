import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users.component.html'
})
export class UsersComponent implements OnInit {

  private http = inject(HttpClient);

  users = signal<any[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.http.get<any[]>('http://localhost:8080/users')
      .subscribe({
        next: (res) => {
          this.users.set(res);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        }
      });
  }
}