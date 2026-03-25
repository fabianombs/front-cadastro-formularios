import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent {

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);


  loading = signal(false);
  success = signal(false);
  error = signal<string | null>(null);

  // ✅ FORM CRIADO CORRETAMENTE
  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    username: ['', Validators.required],
    password: ['', Validators.required],
    confirmPassword: ['', Validators.required]
  }, {
    validators: this.passwordMatchValidator
  });

  submit() {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    this.auth.register(this.form.value).subscribe({
      next: () => {
        this.success.set(true);
        this.loading.set(false);
        this.form.reset();
        this.router.navigate(['/login']);
      },
      error: () => {
        this.error.set('Erro ao cadastrar usuário');
        this.loading.set(false);
        this.error.set('Erro ao cadastrar usuário');
      }
    });
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('password')?.value === form.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  onMouseMove(event: MouseEvent) {
    const x = event.clientX + 'px';
    const y = event.clientY + 'px';

    document.documentElement.style.setProperty('--x', x);
    document.documentElement.style.setProperty('--y', y);
  }
}