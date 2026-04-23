import { Component, OnInit, ChangeDetectorRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormControl,
  ValidatorFn,
} from '@angular/forms';
import { cpfValidator, cnpjValidator } from '../../shared/validators/cpf-cnpj.validator';
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
import { FormFieldComponent } from '../../shared/components/form-field/form-field.component';

@Component({
  selector: 'app-form-dynamic',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormFieldComponent],
  templateUrl: './form-dynamic.component.html',
  styleUrls: ['./form-dynamic.component.scss'],
})
export class FormDynamicComponent implements OnInit {
  public template = signal<FormTemplate | null>(null);
  public loading = signal<boolean>(false);
  public submitted = signal<boolean>(false);
  public form: FormGroup;
  public formFields = signal<FormGroup[]>([]);
  public isEstrangeiro = signal<boolean>(false);
  public showLgpdModal = signal<boolean>(false);
  private pendingSubmitFn: (() => void) | null = null;

  public hasCpfOrPhone = computed(() =>
    this.formFields().some(fg =>
      ['cpf', 'phone'].includes(fg.get('originalType')?.value ?? '')
    )
  );

  // Estado de agendamento
  public selectedDate = signal<string>('');
  public availableSlots = signal<SlotInfo[]>([]);
  public selectedSlot = signal<string>('');
  public loadingSlots = signal<boolean>(false);
  public bookingError = signal<string>('');

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
          if (template.appearance?.fontFamily) {
            this.loadGoogleFont(template.appearance.fontFamily);
          }
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

  private loadGoogleFont(family: string): void {
    const weights = '400;500;600;700';
    const id = `gf-${family.replace(/\s+/g, '-').toLowerCase()}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, '+')}:wght@${weights}&display=swap`;
    document.head.appendChild(link);
  }

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
    if (a.fontFamily) style['font-family'] = `'${a.fontFamily}', sans-serif`;

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
    if (a.fieldBorderColor) style['borderColor'] = a.fieldBorderColor;
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

  titleStyle = computed(() => {
    const a = this.template()?.appearance;
    const style: Record<string, string> = {};
    if (a?.titleFontSize) style['font-size'] = a.titleFontSize;
    if (a?.fontFamily) style['font-family'] = `'${a.fontFamily}', sans-serif`;
    if (a?.formTextColor) style['color'] = a.formTextColor;
    return style;
  });

  submitBtnStyle = computed(() => {
    const a = this.template()?.appearance;
    const color = this.resolvedAccentColor();
    const style: Record<string, string> = {};
    if (color) { style['background-color'] = color; style['border-color'] = color; }
    if (a?.buttonFontSize) style['font-size'] = a.buttonFontSize;
    if (a?.fontFamily) style['font-family'] = `'${a.fontFamily}', sans-serif`;
    return style;
  });

  fieldLabelStyle(fieldColor?: string): Record<string, string> {
    const a = this.template()?.appearance;
    const style: Record<string, string> = {};
    if (fieldColor) style['color'] = fieldColor;
    if (a?.labelFontSize) style['font-size'] = a.labelFontSize;
    return style;
  }

  private buildForm(fields: FormField[]) {
    const fgArray: FormGroup[] = fields.map((f) => {
      const validators: ValidatorFn[] = [];
      if (f.required) validators.push(Validators.required);
      if (f.type === 'cpf') validators.push(cpfValidator());
      if (f.type === 'cnpj') validators.push(cnpjValidator());

      return this.fb.group({
        label: [f.label],
        type: [f.type],
        originalType: [f.type],
        value: ['', validators],
        required: [f.required ?? false],
        fieldColor: [f.fieldColor ?? ''],
        colSpan: [f.colSpan ?? 2],
        options: [f.options ?? []],
      });
    });

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
    this.bookingError.set('');

    if (!date) return;

    const template = this.template();
    if (!template) return;

    this.loadingSlots.set(true);
    this.service.getAvailableSlots(template.id, date).subscribe({
      next: (res: AvailableSlotsResponse) => {
        const today = new Date();
        const isToday = date === today.toISOString().split('T')[0];
        const slots = isToday
          ? res.slots.map(s => {
              const [h, m] = s.time.split(':').map(Number);
              const slotMinutes = h * 60 + m;
              const nowMinutes = today.getHours() * 60 + today.getMinutes();
              return slotMinutes <= nowMinutes ? { ...s, available: false } : s;
            })
          : res.slots;
        this.availableSlots.set(slots);
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
    this.bookingError.set('');
  }

  formatTime(time: string): string {
    return time.substring(0, 5);
  }

  // =====================
  // ESTRANGEIRO
  // =====================

  onEstrangeiroChange(checked: boolean): void {
    this.isEstrangeiro.set(checked);
    this.formFields().forEach((fg, i) => {
      const originalType = fg.get('originalType')?.value as string;
      const valueControl = this.form.get(`field_${i}`) as FormControl;
      const required = fg.get('required')?.value as boolean;

      if (originalType === 'cpf') {
        const validators: ValidatorFn[] = [];
        if (required) validators.push(Validators.required);
        if (!checked) validators.push(cpfValidator());
        fg.get('type')?.setValue(checked ? 'text' : 'cpf', { emitEvent: false });
        valueControl.setValidators(validators);
        valueControl.updateValueAndValidity();
      }

      if (originalType === 'phone') {
        fg.get('type')?.setValue(checked ? 'phone-intl' : 'phone', { emitEvent: false });
      }
    });
    this.cdr.detectChanges();
  }

  // =====================
  // SUBMIT
  // =====================

  public submit() {
    const template = this.template();
    if (!template) return;

    const doSubmit = () => {
      if (template.hasSchedule) {
        this.submitAppointment(template);
      } else {
        this.submitRegularForm(template);
      }
    };

    if (template.lgpdEnabled) {
      this.pendingSubmitFn = doSubmit;
      this.showLgpdModal.set(true);
      this.cdr.detectChanges();
    } else {
      doSubmit();
    }
  }

  lgpdAccept(): void {
    this.showLgpdModal.set(false);
    if (this.pendingSubmitFn) {
      this.pendingSubmitFn();
      this.pendingSubmitFn = null;
    }
  }

  lgpdDecline(): void {
    this.showLgpdModal.set(false);
    this.pendingSubmitFn = null;
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
        this.bookingError.set('');
        this.messages.success('Agendamento realizado com sucesso!');
        this.submitted.set(true);
        this.form.reset();
        this.selectedSlot.set('');
        this.selectedDate.set('');
        this.availableSlots.set([]);
        this.cdr.detectChanges();
      },
      error: (err) => {
        const msg: string = err.error?.message ?? 'Erro ao realizar agendamento.';
        this.messages.error(msg);
        this.bookingError.set(msg);
        this.cdr.detectChanges();
      },
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

  /** Texto de vagas restantes para exibir em cada slot */
  vacancyLabel(slot: SlotInfo): string {
    if (!slot.available) return 'Lotado';
    // Guard: campos podem chegar undefined em backends antigos
    const capacity = slot.capacity ?? 0;
    const booked = slot.bookedCount ?? 0;
    if (capacity <= 1) return 'Disponível';
    const remaining = capacity - booked;
    if (remaining <= 0) return 'Lotado';
    if (remaining === 1) return '1 vaga';
    return `${remaining} vagas`;
  }

  /** Percentual de ocupação para a barra visual (0–100) */
  occupancyPercent(slot: SlotInfo): number {
    const capacity = slot.capacity ?? 0;
    const booked = slot.bookedCount ?? 0;
    if (capacity <= 0) return slot.available ? 0 : 100;
    return Math.min(100, Math.round((booked / capacity) * 100));
  }
}
