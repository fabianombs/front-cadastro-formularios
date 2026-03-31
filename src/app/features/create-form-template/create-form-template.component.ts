import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormTemplateService, FormTemplate, CreateFormTemplateRequest } from '../../core/services/form-template.service';
import { ClientService, Client } from '../../core/services/client.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { switchMap, of } from 'rxjs';

@Component({
  selector: 'app-create-template',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './create-form-template.component.html',
  styleUrls: ['./create-form-template.component.scss']
})
export class CreateTemplateComponent implements OnInit {

  public templateForm: FormGroup;
  public clients: Client[] = [];

  public template: FormTemplate | null = null;
  public slug: string | null = null;
  public loading = false;

  constructor(
    private fb: FormBuilder,
    private templateService: FormTemplateService,
    private clientService: ClientService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.templateForm = this.fb.group({
      name: ['', Validators.required],
      clientId: [null, Validators.required],
      fields: this.fb.array([]),
      hasSchedule: [false],
      scheduleConfig: this.fb.group({
        startTime: ['08:00'],
        endTime: ['17:00'],
        slotDurationMinutes: [60, [Validators.min(15), Validators.max(480)]],
        maxDaysAhead: [30, [Validators.min(1), Validators.max(365)]]
      })
    });
  }

  get fields(): FormArray {
    return this.templateForm.get('fields') as FormArray;
  }

  get hasSchedule(): boolean {
    return this.templateForm.get('hasSchedule')?.value === true;
  }

  get scheduleConfig(): FormGroup {
    return this.templateForm.get('scheduleConfig') as FormGroup;
  }

  get previewSlots(): string[] {
    if (!this.hasSchedule) return [];
    const cfg = this.scheduleConfig.value;
    if (!cfg.startTime || !cfg.endTime || !cfg.slotDurationMinutes) return [];
    return this.generateSlotPreview(cfg.startTime, cfg.endTime, cfg.slotDurationMinutes);
  }

  private generateSlotPreview(start: string, end: string, duration: number): string[] {
    const slots: string[] = [];
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let totalStart = sh * 60 + sm;
    const totalEnd = eh * 60 + em;
    while (totalStart + duration <= totalEnd) {
      const h = Math.floor(totalStart / 60).toString().padStart(2, '0');
      const m = (totalStart % 60).toString().padStart(2, '0');
      slots.push(`${h}:${m}`);
      totalStart += duration;
    }
    return slots;
  }

  ngOnInit(): void {
    this.loadClients();

    this.route.params
      .pipe(
        switchMap(params => {
          const slugParam = params['slug'];
          if (slugParam) {
            this.slug = slugParam;
            this.loading = true;
            return this.templateService.getTemplateBySlug(slugParam);
          }
          return of(null);
        })
      )
      .subscribe({
        next: (res: FormTemplate | null) => {
          if (res) {
            this.template = res;
            this.loadTemplateToForm(res);
          }
          this.loading = false;
        },
        error: () => {
          console.error('Erro ao carregar template');
          this.loading = false;
        }
      });
  }

  addField() {
    this.fields.push(this.fb.group({
      label: ['', Validators.required],
      type: ['text', Validators.required],
      required: [false]
    }));
  }

  removeField(i: number) {
    this.fields.removeAt(i);
  }

  loadClients() {
    this.clientService.findAll(0, 100).subscribe({
      next: clients => {
        this.clients = clients;
        this.cdr.detectChanges();
      },
      error: () => console.error('Erro ao carregar clientes')
    });
  }

  submit() {
    if (this.templateForm.invalid) return;

    const formValue = this.templateForm.value;
    const payload: CreateFormTemplateRequest = {
      name: formValue.name,
      clientId: formValue.clientId,
      fields: formValue.fields,
      scheduleConfig: formValue.hasSchedule ? {
        startTime: formValue.scheduleConfig.startTime + ':00',
        endTime: formValue.scheduleConfig.endTime + ':00',
        slotDurationMinutes: formValue.scheduleConfig.slotDurationMinutes,
        maxDaysAhead: formValue.scheduleConfig.maxDaysAhead
      } : null
    };

    this.templateService.createTemplate(payload.clientId, payload).subscribe({
      next: (res: FormTemplate) => {
        alert('Template criado com sucesso!');
        this.template = res;
        this.slug = res.slug;
        this.loadTemplateToForm(res);
      },
      error: (err) => {
        console.error('Erro ao criar template:', err.status, err.error);
        alert(`Erro ao criar template (${err.status}): ${err.error?.message ?? 'Verifique o console'}`);
      }
    });
  }

  loadTemplateToForm(template: FormTemplate) {
    this.templateForm.patchValue({
      name: template.name,
      clientId: (template as any).clientId ?? null,
      hasSchedule: template.hasSchedule
    });

    if (template.hasSchedule && template.scheduleConfig) {
      this.scheduleConfig.patchValue({
        startTime: template.scheduleConfig.startTime.substring(0, 5),
        endTime: template.scheduleConfig.endTime.substring(0, 5),
        slotDurationMinutes: template.scheduleConfig.slotDurationMinutes,
        maxDaysAhead: template.scheduleConfig.maxDaysAhead
      });
    }

    this.fields.clear();
    template.fields.forEach(f => {
      this.fields.push(this.fb.group({
        label: [f.label, Validators.required],
        type: [f.type, Validators.required],
        required: [f.required ?? false]
      }));
    });

    this.cdr.detectChanges();
  }

  get formLink(): string {
    return `/forms/${this.template?.slug ?? ''}`;
  }
}
