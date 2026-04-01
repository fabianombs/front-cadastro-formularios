import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormBuilder, Validators, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  loading = signal(false);
  error = signal<string | null>(null);

  // 📌 Tipagem explícita evita problemas futuros
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
  ) {
    // ✅ Agora fb já existe
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  submit() {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    this.auth.login(this.form.value as any).subscribe({
      next: (res) => {
        this.auth.setSession(res.token);
        this.router.navigate(['/']);
      },
      error: () => {
        this.error.set('Credenciais inválidas');
        this.loading.set(false);
      },
    });
  }

  onMouseMove(event: MouseEvent) {
    const x = event.clientX + 'px';
    const y = event.clientY + 'px';

    document.documentElement.style.setProperty('--x', x);
    document.documentElement.style.setProperty('--y', y);
  }
}
