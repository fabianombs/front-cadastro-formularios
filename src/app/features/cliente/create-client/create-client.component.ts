import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { ClientService } from '../../../core/services/client.service';
import { MessageService } from '../../../core/services/message.service';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormFieldComponent],
  templateUrl: './create-client.component.html',
  styleUrls: ['./create-client.component.scss'],
})
export class CreateClientComponent {
  private service = inject(ClientService);
  private router = inject(Router);
  private messages = inject(MessageService);
  private fb = inject(FormBuilder);

  loading = false;

  // ==========================
  // FormGroup com FormBuilder
  // ==========================
  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    company: [''],
    notes: [''],
  });

  // ==========================
  // Getters para FormControls
  // ==========================
  get nameControl(): FormControl {
    return this.form.get('name') as FormControl;
  }
  get usernameControl(): FormControl {
    return this.form.get('username') as FormControl;
  }
  get emailControl(): FormControl {
    return this.form.get('email') as FormControl;
  }
  get phoneControl(): FormControl {
    return this.form.get('phone') as FormControl;
  }
  get companyControl(): FormControl {
    return this.form.get('company') as FormControl;
  }
  get notesControl(): FormControl {
    return this.form.get('notes') as FormControl;
  }

  // ==========================
  // Submit
  // ==========================
  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched(); // mostra erros
      return;
    }

    this.loading = true;

    this.service.create(this.form.value).subscribe({
      next: () => {
        this.messages.success('Cliente criado com sucesso 🚀');
        this.router.navigate(['/clients']);
      },
      error: () => {
        this.messages.error('Erro ao criar cliente');
        this.loading = false;
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