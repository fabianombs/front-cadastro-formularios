import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService, Client } from '../../core/services/client.service';
import { MessageService } from '../../core/services/message.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import {
  DataTableComponent,
  DataTableColumn,
} from '../../shared/components/data-table/data-table.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageShellComponent,
    PageHeaderComponent,
    DataTableComponent,
    ConfirmModalComponent,
  ],
  templateUrl: './cliente.component.html',
})
export class ClienteComponent implements OnInit {
  private service = inject(ClientService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private messages = inject(MessageService);

  clients = signal<Client[]>([]);
  loading = signal(true);

  page = signal(0);
  readonly size = 10;
  totalPages = signal(0);
  totalElements = signal(0);

  // ── Modal de confirmação ──
  deleteModalOpen = signal(false);
  deleteTargetId = signal<number | null>(null);
  deleteTargetName = signal('');
  deleting = signal(false);

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

  deleteClient(id: number, name: string): void {
    this.deleteTargetId.set(id);
    this.deleteTargetName.set(name);
    this.deleteModalOpen.set(true);
  }

  onDeleteConfirmed(): void {
    const id = this.deleteTargetId();
    if (id === null) return;

    this.deleting.set(true);
    this.service.delete(id).subscribe({
      next: () => {
        this.messages.success('Cliente excluído com sucesso');
        this.deleteModalOpen.set(false);
        this.deleting.set(false);
        this.loadClients();
      },
      error: () => {
        this.messages.error('Erro ao excluir cliente');
        this.deleting.set(false);
      },
    });
  }

  onDeleteCancelled(): void {
    this.deleteModalOpen.set(false);
    this.deleteTargetId.set(null);
    this.deleteTargetName.set('');
  }
}
