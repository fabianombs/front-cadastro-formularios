import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService, Client } from '../../core/services/client.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import {
  DataTableComponent,
  DataTableColumn,
} from '../../shared/components/data-table/data-table.component';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, PageShellComponent, PageHeaderComponent, DataTableComponent],
  templateUrl: './cliente.component.html',
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

  clientColumns: DataTableColumn[] = [
    { key: 'id', label: 'ID', width: '60px' },
    { key: 'name', label: 'Nome' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Telefone' },
    { key: 'company', label: 'Empresa' },
    { key: 'actions', label: '', width: '80px' },
  ];

  search = signal('');
  companyFilter = signal('');

  uniqueCompanies = computed(() => [
    ...new Set(
      this.clients()
        .map((client) => client.company)
        .filter((company): company is string => !!company),
    ),
  ]);

  filteredClients = computed(() => {
    const search = this.search().toLowerCase().trim();
    const company = this.companyFilter();
    return this.clients().filter((client) => {
      const matchesCompany = !company || client.company === company;
      if (!matchesCompany) return false;
      if (!search) return true;
      return (
        client.name.toLowerCase().includes(search) ||
        client.email.toLowerCase().includes(search) ||
        (client.phone ?? '').toLowerCase().includes(search) ||
        (client.company ?? '').toLowerCase().includes(search)
      );
    });
  });

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
      error: () => this.loading.set(false),
    });
  }

  nextPage() {
    if (this.page() < this.totalPages() - 1) {
      this.page.update((p) => p + 1);
      this.loadClients();
    }
  }

  prevPage() {
    if (this.page() > 0) {
      this.page.update((p) => p - 1);
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
