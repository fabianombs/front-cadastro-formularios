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

  ngOnInit() {
    this.loadClients();
  }

  loadClients() {
    this.loading.set(true);

    this.service.findAll().subscribe({
      next: (res) => {
        this.clients.set(res); // ⚠️ Page<>
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
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