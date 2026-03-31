import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClientService, Client } from '../../core/services/client.service';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cliente.component.html'
})
export class ClienteComponent implements OnInit {

  private service = inject(ClientService);
  private auth = inject(AuthService);
  private router = inject(Router);

  clients = signal<Client[]>([]);
  loading = signal(true);

  page = signal(0);
  readonly size = 10;
  totalPages = signal(0);
  totalElements = signal(0);

  ngOnInit() {
    this.loadClients();
  }

  loadClients() {
    this.loading.set(true);

    this.service.findAll(this.page(), this.size).subscribe({
      next: (res) => {
        this.clients.set(res.content);
        this.totalPages.set(res.totalPages);
        this.totalElements.set(res.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  nextPage() {
    if (this.page() < this.totalPages() - 1) {
      this.page.update(p => p + 1);
      this.loadClients();
    }
  }

  prevPage() {
    if (this.page() > 0) {
      this.page.update(p => p - 1);
      this.loadClients();
    }
  }

  isAdmin() {
    return this.auth.isAdmin();
  }

  goToCreate() {
    this.router.navigate(['/clients/new']);
  }

  deleteClient(id: number) {
    if (!confirm('Excluir cliente?')) return;

    this.service.delete(id).subscribe(() => {
      this.loadClients();
    });
  }
}
