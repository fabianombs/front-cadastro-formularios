import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  FormTemplateService,
  FormTemplate,
  CreateFormTemplateRequest,
  AttendanceRecord
} from '../../core/services/form-template.service';
import { ClientService, Client } from '../../core/services/client.service';
import { ExportService } from '../../core/services/export.service';
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

  // Presença — dados em memória antes de criar o template
  public pendingAttendanceRows: Record<string, string>[] = [];
  public pendingAttendanceCols: string[] = [];
  public pendingAttendanceFileName = '';
  public parsingFile = false;

  // Presença — dados já salvos (view mode)
  public attendanceRecords: AttendanceRecord[] = [];
  public attendanceCols: string[] = [];
  public importingAttendance = false;

  constructor(
    private fb: FormBuilder,
    private templateService: FormTemplateService,
    private clientService: ClientService,
    private exportService: ExportService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.templateForm = this.fb.group({
      name: ['', Validators.required],
      clientId: [null, Validators.required],
      fields: this.fb.array([]),
      hasSchedule: [false],
      hasAttendance: [false],
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

  get hasAttendance(): boolean {
    return this.templateForm.get('hasAttendance')?.value === true;
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
            this.loadAttendance(res.id);
          }
          this.loading = false;
        },
        error: () => { this.loading = false; }
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
      next: res => { this.clients = res.content; this.cdr.detectChanges(); },
      error: () => console.error('Erro ao carregar clientes')
    });
  }

  // ── Upload no CREATE mode ──────────────────────────────────────
  onPendingFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.parsingFile = true;
    this.pendingAttendanceFileName = file.name;

    this.exportService.readExcelFile(file).then(rows => {
      this.pendingAttendanceRows = rows;
      const keys = new Set<string>();
      rows.forEach(r => Object.keys(r).forEach(k => keys.add(k)));
      this.pendingAttendanceCols = Array.from(keys);
      this.parsingFile = false;
      this.cdr.detectChanges();
    }).catch(() => {
      alert('Arquivo inválido. Use .xlsx ou .xls');
      this.pendingAttendanceFileName = '';
      this.pendingAttendanceRows = [];
      this.pendingAttendanceCols = [];
      this.parsingFile = false;
    });

    input.value = '';
  }

  clearPendingFile() {
    this.pendingAttendanceRows = [];
    this.pendingAttendanceCols = [];
    this.pendingAttendanceFileName = '';
  }

  // ── Submit ────────────────────────────────────────────────────
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
        this.template = res;
        this.slug = res.slug;
        this.loadTemplateToForm(res);

        // Se tem lista pendente, importa logo após criar
        if (formValue.hasAttendance && this.pendingAttendanceRows.length > 0) {
          this.importingAttendance = true;
          this.templateService.importAttendance(res.id, { rows: this.pendingAttendanceRows }).subscribe({
            next: (records) => {
              this.setAttendanceRecords(records);
              this.importingAttendance = false;
              this.cdr.detectChanges();
            },
            error: () => {
              alert('Template criado, mas houve erro ao importar a lista de presença.');
              this.importingAttendance = false;
            }
          });
        }
      },
      error: (err) => {
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

  // ── Attendance (view mode) ─────────────────────────────────────
  loadAttendance(templateId: number) {
    this.templateService.getAttendance(templateId).subscribe({
      next: (records) => this.setAttendanceRecords(records),
      error: () => {}
    });
  }

  onAttendanceFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.template) return;

    this.importingAttendance = true;
    this.exportService.readExcelFile(file).then(rows => {
      this.templateService.importAttendance(this.template!.id, { rows }).subscribe({
        next: (records) => {
          this.setAttendanceRecords(records);
          this.importingAttendance = false;
          this.cdr.detectChanges();
        },
        error: () => {
          alert('Erro ao importar planilha.');
          this.importingAttendance = false;
        }
      });
    }).catch(() => {
      alert('Arquivo inválido. Use .xlsx ou .xls');
      this.importingAttendance = false;
    });

    input.value = '';
  }

  private setAttendanceRecords(records: AttendanceRecord[]) {
    this.attendanceRecords = records;
    const keys = new Set<string>();
    records.forEach(r => Object.keys(r.rowData || {}).forEach(k => keys.add(k)));
    this.attendanceCols = Array.from(keys);
    this.cdr.detectChanges();
  }

  exportAttendance() {
    if (!this.template) return;
    this.exportService.exportAttendance(this.attendanceRecords, this.template.name);
  }

  get formLink(): string {
    return `/forms/${this.template?.slug ?? ''}`;
  }
}
