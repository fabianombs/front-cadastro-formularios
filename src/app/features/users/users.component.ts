import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService, User } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html'
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
      error: () => this.loading.set(false)
    });
  }

  nextPage() {
    if (this.page() < this.totalPages() - 1) {
      this.page.update(p => p + 1);
      this.loadUsers();
    }
  }

  prevPage() {
    if (this.page() > 0) {
      this.page.update(p => p - 1);
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

    this.userService.update(id, {
      username: data.username!,
      role: data.role!
    }).subscribe(() => {
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
