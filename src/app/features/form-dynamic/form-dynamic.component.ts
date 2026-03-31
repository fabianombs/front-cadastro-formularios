import { Component, OnInit, ChangeDetectorRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  FormTemplateService,
  FormTemplate,
  FormField,
  AvailableSlotsResponse,
  SlotInfo,
  BookAppointmentRequest
} from '../../core/services/form-template.service';

@Component({
  selector: 'app-form-dynamic',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './form-dynamic.component.html',
  styleUrls: ['./form-dynamic.component.scss']
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

  constructor(
    private route: ActivatedRoute,
    private service: FormTemplateService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
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
          alert('Erro ao carregar o formulário');
          this.loading.set(false);
        }
      });
    }
  }

  private buildForm(fields: FormField[]) {
    const fgArray: FormGroup[] = fields.map(f =>
      this.fb.group({
        label: [f.label],
        type: [f.type],
        value: ['', f.required ? Validators.required : []],
        required: [f.required ?? false]
      })
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
        alert('Erro ao carregar horários disponíveis');
        this.loadingSlots.set(false);
      }
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
      alert('Preencha todos os campos obrigatórios!');
      return;
    }

    const values: { [key: string]: string } = {};
    this.formFields().forEach((fg, i) => {
      values[fg.value.label] = (this.form.get(`field_${i}`) as FormControl).value;
    });

    this.service.submitForm({ templateId: template.id, values }).subscribe({
      next: () => {
        this.submitted.set(true);
        this.form.reset();
      },
      error: () => alert('Erro ao enviar formulário')
    });
  }

  private submitAppointment(template: FormTemplate): void {
    if (!this.selectedDate()) {
      alert('Selecione uma data para o atendimento');
      return;
    }
    if (!this.selectedSlot()) {
      alert('Selecione um horário disponível');
      return;
    }
    if (this.form.invalid) {
      alert('Preencha todos os campos obrigatórios!');
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
      extraValues
    };

    this.service.bookAppointment(payload).subscribe({
      next: () => {
        this.submitted.set(true);
        this.form.reset();
        this.selectedDate.set('');
        this.selectedSlot.set('');
        this.availableSlots.set([]);
      },
      error: (err) => {
        const msg = err.error?.message ?? 'Erro ao realizar agendamento';
        alert(msg);
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
