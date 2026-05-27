import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FormTemplateService,
  FormTemplate,
  FormField,
} from '../../core/services/form-template.service';

type Step = 'loading' | 'form' | 'success' | 'error';

@Component({
  selector: 'app-attendance-checkin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance-checkin.component.html',
  styleUrls: ['./attendance-checkin.component.scss'],
})
export class AttendanceCheckinComponent implements OnInit {
  private route   = inject(ActivatedRoute);
  private service = inject(FormTemplateService);

  step     = signal<Step>('loading');
  template = signal<FormTemplate | null>(null);
  errorMsg = signal('');
  submitting = signal(false);

  // Valores do formulário: campo label → valor digitado
  formValues = signal<Record<string, string>>({});

  // Campos visíveis do template (exclui campos de sistema/acompanhantes)
  fields = computed<FormField[]>(() => {
    return this.template()?.fields ?? [];
  });

  slug = '';

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.service.getTemplateBySlug(this.slug).subscribe({
      next: (t) => {
        this.template.set(t);
        // Inicializa o mapa de valores com string vazia para cada campo
        const initial: Record<string, string> = {};
        (t.fields ?? []).forEach(f => { initial[f.label] = ''; });
        this.formValues.set(initial);
        this.step.set('form');
      },
      error: () => {
        this.errorMsg.set('Formulário não encontrado ou link inválido.');
        this.step.set('error');
      },
    });
  }

  setValue(label: string, value: string): void {
    this.formValues.update(v => ({ ...v, [label]: value }));
  }

  // Verifica se todos os campos obrigatórios foram preenchidos
  isValid = computed<boolean>(() => {
    const vals = this.formValues();
    return (this.fields() ?? [])
      .filter(f => f.required)
      .every(f => (vals[f.label] ?? '').trim().length > 0);
  });

  submit(): void {
    if (!this.isValid() || this.submitting()) return;

    this.submitting.set(true);

    // Envia apenas campos com valor preenchido
    const rowData: Record<string, string> = {};
    Object.entries(this.formValues()).forEach(([k, v]) => {
      if (v.trim()) rowData[k] = v.trim();
    });

    this.service.addPublicGuest(this.slug, rowData).subscribe({
      next: () => {
        this.step.set('success');
        this.submitting.set(false);
      },
      error: () => {
        this.errorMsg.set('Erro ao cadastrar. Tente novamente.');
        this.submitting.set(false);
      },
    });
  }

  addAnother(): void {
    const initial: Record<string, string> = {};
    (this.template()?.fields ?? []).forEach(f => { initial[f.label] = ''; });
    this.formValues.set(initial);
    this.step.set('form');
  }
}
