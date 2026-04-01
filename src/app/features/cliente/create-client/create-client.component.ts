import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClientService } from '../../../core/services/client.service';

export interface CreateClientRequest {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
  username: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-client.component.html',
})
export class CreateClientComponent {
  private service = inject(ClientService);
  private router = inject(Router);

  loading = signal(false);

  form = signal({
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: '',
    username: '',
  });

  errors = signal({
    name: '',
    email: '',
    username: '',
  });

  // ==========================
  // Validação básica
  // ==========================
  validate(): boolean {
    const f = this.form();

    this.errors.set({
      name: f.name ? '' : 'Nome é obrigatório',
      email: /\S+@\S+\.\S+/.test(f.email) ? '' : 'Email inválido',
      username: f.username ? '' : 'Username é obrigatório',
    });

    return !this.errors().name && !this.errors().email && !this.errors().username;
  }

  // ==========================
  // Submit
  // ==========================
  submit() {
    if (!this.validate()) return;

    this.loading.set(true);

    this.service.create(this.form()).subscribe({
      next: () => {
        alert('Cliente criado com sucesso 🚀');
        this.router.navigate(['/clients']);
      },
      error: () => {
        alert('Erro ao criar cliente');
        this.loading.set(false);
      },
    });
  }

  // ==========================
  // Redirect
  // ==========================
  redirectToList() {
    this.router.navigate(['/clients']);
  }
}
