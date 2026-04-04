import { Component, OnInit, ChangeDetectorRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormControl,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  FormTemplateService,
  FormTemplate,
  FormField,
  AvailableSlotsResponse,
  SlotInfo,
  BookAppointmentRequest,
} from '../../core/services/form-template.service';
import { MessageService } from '../../core/services/message.service';

@Component({
  selector: 'app-form-dynamic',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './form-dynamic.component.html',
  styleUrls: ['./form-dynamic.component.scss'],
})
export class FormDynamicComponent implements OnInit {
  public template = signal<FormTemplate | null>(null);
  public loading = signal<boolean>(false);
  public submitted = signal<boolean>(false);
  public form: FormGroup;
  public formFields = signal<FormGroup[]>([]);

  // Estado de agendamento
  public selectedDate = signal<string>('');
  public availableSlots = signal<SlotInfo[]>([]);
  public selectedSlot = signal<string>('');
  public loadingSlots = signal<boolean>(false);

  public get minDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  public get maxDate(): string {
    const template = this.template();
    if (!template?.scheduleConfig) return '';
    const max = new Date();
    max.setDate(max.getDate() + template.scheduleConfig.maxDaysAhead);
    return max.toISOString().split('T')[0];
  }

  private messages = inject(MessageService);

  constructor(
    private route: ActivatedRoute,
    private service: FormTemplateService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({});
  }

  ngOnInit(): void {
    this.loading.set(true);

    const slug = this.route.snapshot.params['slug'];
    if (slug) {
      this.service.getTemplateBySlug(slug).subscribe({
        next: (template) => {
          this.template.set(template);
          this.buildForm(template.fields);
          this.loading.set(false);
        },
        error: () => {
          this.messages.error('Erro ao carregar o formulário');
          this.loading.set(false);
        },
      });
    }
  }

  // =====================
  // APPEARANCE STYLES
  // =====================

  pageStyle = computed(() => {
    const a = this.template()?.appearance;
    if (!a) return {};
    const style: Record<string, string> = {};
    if (a.backgroundGradient) {
      style['background'] = a.backgroundGradient;
    } else if (a.backgroundImageUrl) {
      style['backgroundImage'] = `url(${a.backgroundImageUrl})`;
      style['backgroundSize'] = 'cover';
      style['backgroundPosition'] = 'center';
    } else if (a.backgroundColor) {
      style['backgroundColor'] = a.backgroundColor;
    }
    if (a.formTextColor) style['color'] = a.formTextColor;

    // ── CSS custom properties para componentes filhos ────────────
    const hasBg = !!(a.backgroundGradient || a.backgroundImageUrl || a.backgroundColor);
    if (hasBg) {
      const accent = this.resolvedAccentColor() ?? '#4d8fff';
      const cardBg = a.cardBackgroundColor || 'rgba(10, 16, 32, 0.68)';
      const cardBorder = a.cardBorderColor || 'rgba(255, 255, 255, 0.1)';

      style['--surface'] = cardBg;
      style['--surface-high'] = a.cardBackgroundColor ? cardBg : 'rgba(15, 25, 50, 0.8)';
      style['--bg-subtle'] = a.cardBackgroundColor ? cardBg : 'rgba(5, 10, 20, 0.72)';
      style['--border'] = cardBorder;
      style['--border-hover'] = a.cardBorderColor ? cardBorder : 'rgba(255, 255, 255, 0.18)';
      style['--text'] = a.formTextColor || '#d8e4f8';
      style['--text-muted'] = a.formTextColor
        ? this.hexToRgba(a.formTextColor, 0.65)
        : 'rgba(216, 228, 248, 0.65)';
      style['--primary'] = accent;
      style['--primary-muted'] = this.hexToRgba(accent, 0.12);
      style['--primary-glow'] = this.hexToRgba(accent, 0.22);
      style['--surface-hover'] = this.hexToRgba(accent, 0.08);
    }

    return style;
  });

  /** Converte hex para rgba — suporta #rrggbb e #rgb */
  private hexToRgba(hex: string, alpha: number): string {
    if (!hex || !hex.startsWith('#')) return `rgba(77,143,255,${alpha})`;
    let h = hex.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if (isNaN(r + g + b)) return `rgba(77,143,255,${alpha})`;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  formCardStyle = computed(() => {
    const a = this.template()?.appearance;
    const hasBg = a?.backgroundGradient || a?.backgroundImageUrl || a?.backgroundColor;
    if (!hasBg && !a?.cardBackgroundColor) return {};

    const border = a?.cardBorderColor
      ? `1px solid ${a.cardBorderColor}`
      : '1px solid rgba(255,255,255,0.14)';

    if (a?.cardBackgroundColor) {
      return { background: a.cardBackgroundColor, border };
    }
    return {
      background: 'rgba(255,255,255,0.08)',
      'backdrop-filter': 'blur(14px)',
      '-webkit-backdrop-filter': 'blur(14px)',
      border,
    };
  });

  fieldInputStyle = computed(() => {
    const a = this.template()?.appearance;
    if (!a) return {};
    const style: Record<string, string> = {};
    if (a.fieldBackgroundColor) style['backgroundColor'] = a.fieldBackgroundColor;
    if (a.fieldTextColor) style['color'] = a.fieldTextColor;
    const accent = this.resolvedAccentColor();
    if (accent) style['borderColor'] = accent;
    return style;
  });

  /** Cor de destaque: usa primaryColor ou deriva do gradiente automaticamente */
  private resolvedAccentColor = computed(() => {
    const a = this.template()?.appearance;
    if (!a) return null;
    if (a.primaryColor) return a.primaryColor;
    if (a.backgroundGradient) {
      const hex = a.backgroundGradient.match(/#[0-9a-fA-F]{6}/);
      if (hex) return hex[0];
    }
    if (a.backgroundColor) return a.backgroundColor;
    return null;
  });

  submitBtnStyle = computed(() => {
    const color = this.resolvedAccentColor();
    if (!color) return {};
    return { 'background-color': color, 'border-color': color };
  });

  fieldLabelStyle(fieldColor?: string): Record<string, string> {
    if (!fieldColor) return {};
    return { color: fieldColor };
  }

  private buildForm(fields: FormField[]) {
    const fgArray: FormGroup[] = fields.map((f) =>
      this.fb.group({
        label: [f.label],
        type: [f.type],
        value: ['', f.required ? Validators.required : []],
        required: [f.required ?? false],
        fieldColor: [f.fieldColor ?? ''],
        colSpan: [f.colSpan ?? 2],
      }),
    );

    this.formFields.set(fgArray);

    fgArray.forEach((fg, i) => {
      const control = fg.get('value') as FormControl;
      this.form.addControl(`field_${i}`, control);
    });

    this.cdr.detectChanges();
  }

  // =====================
  // AGENDAMENTO
  // =====================

  onDateChange(event: Event): void {
    const date = (event.target as HTMLInputElement).value;
    this.selectedDate.set(date);
    this.selectedSlot.set('');
    this.availableSlots.set([]);

    if (!date) return;

    const template = this.template();
    if (!template) return;

    this.loadingSlots.set(true);
    this.service.getAvailableSlots(template.id, date).subscribe({
      next: (res: AvailableSlotsResponse) => {
        this.availableSlots.set(res.slots);
        this.loadingSlots.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.messages.error('Erro ao carregar horários disponíveis');
        this.loadingSlots.set(false);
      },
    });
  }

  selectSlot(slot: SlotInfo): void {
    if (!slot.available) return;
    this.selectedSlot.set(slot.time);
  }

  formatTime(time: string): string {
    return time.substring(0, 5);
  }

  // =====================
  // SUBMIT
  // =====================

  public submit() {
    const template = this.template();
    if (!template) return;

    if (template.hasSchedule) {
      this.submitAppointment(template);
    } else {
      this.submitRegularForm(template);
    }
  }

  private submitRegularForm(template: FormTemplate): void {
    if (this.form.invalid) {
      this.messages.warning('Preencha todos os campos obrigatórios!');
      return;
    }

    const values: { [key: string]: string } = {};
    this.formFields().forEach((fg, i) => {
      values[fg.value.label] = (this.form.get(`field_${i}`) as FormControl).value;
    });

    this.service.submitForm({ templateId: template.id, values }).subscribe({
      next: () => {
        this.messages.success('Formulário enviado com sucesso!');
        this.form.reset();
      },
      error: () => this.messages.error('Erro ao enviar formulário'),
    });
  }

  private submitAppointment(template: FormTemplate): void {
    if (!this.selectedDate()) {
      this.messages.warning('Selecione uma data para o atendimento');
      return;
    }
    if (!this.selectedSlot()) {
      this.messages.warning('Selecione um horário disponível');
      return;
    }
    if (this.form.invalid) {
      this.messages.warning('Preencha todos os campos obrigatórios!');
      return;
    }

    const extraValues: { [key: string]: string } = {};
    this.formFields().forEach((fg, i) => {
      extraValues[fg.value.label] = (this.form.get(`field_${i}`) as FormControl).value;
    });

    // Nome e contato vêm dos campos extras (procura por campos comuns)
    const bookedByName = this.resolveNameField(extraValues);
    const bookedByContact = this.resolveContactField(extraValues);

    const payload: BookAppointmentRequest = {
      templateId: template.id,
      slotDate: this.selectedDate(),
      slotTime: this.selectedSlot(),
      bookedByName,
      bookedByContact,
      extraValues,
    };

    this.service.bookAppointment(payload).subscribe({
      next: () => {
        this.messages.success('Agendamento realizado com sucesso!');
        this.submitted.set(true);

        this.form.reset();

        // só limpa o slot selecionado
        this.selectedSlot.set('');

        // opcional: recarrega horários da mesma data
        const template = this.template();
        const date = this.selectedDate();

        if (template && date) {
          this.service.getAvailableSlots(template.id, date).subscribe(res => {
            this.availableSlots.set(res.slots);
          });
        }
      }
    });

  }

  private resolveNameField(values: { [key: string]: string }): string {
    const nameKeys = ['nome', 'name', 'nome completo', 'full name'];
    for (const key of Object.keys(values)) {
      if (nameKeys.includes(key.toLowerCase())) return values[key];
    }
    return Object.values(values)[0] ?? '';
  }

  private resolveContactField(values: { [key: string]: string }): string {
    const contactKeys = ['email', 'telefone', 'phone', 'contato', 'contact', 'celular'];
    for (const key of Object.keys(values)) {
      if (contactKeys.includes(key.toLowerCase())) return values[key];
    }
    return Object.values(values)[1] ?? '';
  }

  public getControl(index: number): FormControl {
    return this.form.get(`field_${index}`) as FormControl;
  }
}
