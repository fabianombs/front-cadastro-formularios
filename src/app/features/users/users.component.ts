import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService, User } from '../../core/services/user.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import {
  DataTableComponent,
  DataTableColumn,
} from '../../shared/components/data-table/data-table.component';
import { AuthService } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, PageShellComponent, PageHeaderComponent, DataTableComponent],
  templateUrl: './users.component.html',
})
export class UsersComponent implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);

  users = signal<User[]>([]);
  loading = signal(true);

  page = signal(0);
  readonly size = 10;
  totalPages = signal(0);
  totalElements = signal(0);

  editingUserId = signal<number | null>(null);
  editedUser = signal<Partial<User>>({});

  search = signal('');
  roleFilter = signal('');

  filteredUsers = computed(() => {
    const search = this.search().toLowerCase().trim();
    const role = this.roleFilter();
    return this.users().filter((user) => {
      const matchesRole = !role || user.role === role;
      if (!matchesRole) return false;
      if (!search) return true;
      return (
        user.username.toLowerCase().includes(search) ||
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.role.toLowerCase().includes(search)
      );
    });
  });

  userColumns: DataTableColumn[] = [
    { key: 'id', label: 'ID', width: '60px' },
    { key: 'username', label: 'Usuário' },
    { key: 'name', label: 'Nome' },
    { key: 'email', label: 'E-mail' },
    { key: 'role', label: 'Perfil' },
    { key: 'actions', label: '', width: '160px' },
  ];

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading.set(true);

    this.userService.findAll(this.page(), this.size).subscribe({
      next: (res) => {
        this.users.set(res.content);
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
      this.loadUsers();
    }
  }

  prevPage() {
    if (this.page() > 0) {
      this.page.update((p) => p - 1);
      this.loadUsers();
    }
  }

  isAdmin() {
    return this.authService.isAdmin();
  }

  startEdit(user: User) {
    this.editingUserId.set(user.id);
    this.editedUser.set({ ...user });
  }

  cancelEdit() {
    this.editingUserId.set(null);
  }

  saveEdit(id: number) {
    const data = this.editedUser();

    this.userService
      .update(id, {
        name: data.name!,
        email: data.email!,
        role: data.role!,
      })
      .subscribe(() => {
        this.editingUserId.set(null);
        this.loadUsers();
      });
  }

  deleteUser(id: number) {
    if (!confirm('Tem certeza que deseja excluir?')) return;

    this.userService.delete(id).subscribe(() => {
      this.loadUsers();
    });
  }
}
