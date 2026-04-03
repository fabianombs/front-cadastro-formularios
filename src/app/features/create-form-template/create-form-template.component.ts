import { Component, OnInit, ChangeDetectorRef, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  FormTemplateService,
  FormTemplate,
  CreateFormTemplateRequest,
  AttendanceRecord,
} from '../../core/services/form-template.service';
import { ClientService, Client } from '../../core/services/client.service';
import { ExportService } from '../../core/services/export.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { switchMap, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-create-template',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, DragDropModule],
  templateUrl: './create-form-template.component.html',
  styleUrls: ['./create-form-template.component.scss'],
})
export class CreateTemplateComponent implements OnInit {
  public templateForm: FormGroup;
  public clients: Client[] = [];

  public template: FormTemplate | null = null;
  public slug: string | null = null;
  public loading = false;
  public showAppearance = false;

  // Upload state: qual campo está fazendo upload e preview local
  uploadingField = signal<string | null>(null);
  imagePreviews: Record<string, string> = {};

  readonly gradientPresets = [
    { label: 'Meia-noite', value: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' },
    { label: 'Oceano', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { label: 'Aurora', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { label: 'Céu', value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { label: 'Pôr do sol', value: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
    { label: 'Esmeralda', value: 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)' },
    { label: 'Carvão', value: 'linear-gradient(135deg, #232526 0%, #414345 100%)' },
    { label: 'Lavanda', value: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
  ];

  applyGradientPreset(value: string) {
    this.templateForm.get('appearance.backgroundGradient')?.setValue(value);
    this.templateForm.get('appearance.backgroundColor')?.setValue('');
    this.templateForm.get('appearance.backgroundImageUrl')?.setValue('');
  }

  /** Upload de imagem (header / footer / background) */
  onImageFileChange(
    field: 'headerImageUrl' | 'footerImageUrl' | 'backgroundImageUrl',
    event: Event,
  ) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Preview local imediato
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreviews[field] = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);

    // Enviar para o backend
    this.uploadingField.set(field);
    this.templateService.uploadImage(file).subscribe({
      next: ({ url }) => {
        this.templateForm.get(`appearance.${field}`)?.setValue(url);
        this.uploadingField.set(null);
        // Se era backgroundImage, limpar gradiente/cor
        if (field === 'backgroundImageUrl') {
          this.templateForm.get('appearance.backgroundGradient')?.setValue('');
          this.templateForm.get('appearance.backgroundColor')?.setValue('');
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.uploadingField.set(null);
        alert('Erro ao enviar imagem. Tente novamente.');
        this.imagePreviews[field] = '';
        input.value = '';
        this.cdr.detectChanges();
      },
    });
  }

  clearImage(field: 'headerImageUrl' | 'footerImageUrl' | 'backgroundImageUrl') {
    this.templateForm.get(`appearance.${field}`)?.setValue('');
    this.imagePreviews[field] = '';
  }

  get previewPageStyle(): Record<string, string> {
    const a = this.templateForm.get('appearance')?.value ?? {};
    const style: Record<string, string> = {};
    if (a.backgroundGradient) style['background'] = a.backgroundGradient;
    else if (a.backgroundImageUrl) {
      style['backgroundImage'] = `url(${a.backgroundImageUrl})`;
      style['backgroundSize'] = 'cover';
      style['backgroundPosition'] = 'center';
    } else if (a.backgroundColor) style['backgroundColor'] = a.backgroundColor;
    if (a.formTextColor) style['color'] = a.formTextColor;
    return style;
  }

  get previewFormCardStyle(): Record<string, string> {
    const a = this.templateForm.get('appearance')?.value ?? {};
    const hasBg = a.backgroundGradient || a.backgroundImageUrl || a.backgroundColor;
    const style: Record<string, string> = { 'border-radius': '10px' };
    if (a.cardBackgroundColor) {
      style['background'] = a.cardBackgroundColor;
      style['border'] = `1px solid ${a.cardBorderColor || 'rgba(255,255,255,0.14)'}`;
    } else if (hasBg) {
      style['background'] = 'rgba(255,255,255,0.08)';
      style['backdrop-filter'] = 'blur(14px)';
      style['-webkit-backdrop-filter'] = 'blur(14px)';
      style['border'] = `1px solid ${a.cardBorderColor || 'rgba(255,255,255,0.14)'}`;
    }
    return style;
  }

  get previewInputStyle(): Record<string, string> {
    const a = this.templateForm.get('appearance')?.value ?? {};
    const style: Record<string, string> = {};
    if (a.fieldBackgroundColor) style['backgroundColor'] = a.fieldBackgroundColor;
    if (a.fieldTextColor) style['color'] = a.fieldTextColor;
    if (a.primaryColor) style['borderColor'] = a.primaryColor;
    return style;
  }

  get previewBtnStyle(): Record<string, string> {
    const a = this.templateForm.get('appearance')?.value ?? {};
    if (!a.primaryColor) return {};
    return { 'background-color': a.primaryColor, 'border-color': a.primaryColor };
  }

  // ── PREVIEW DA LISTAGEM ──────────────────────────────────────

  get previewAccentColor(): string {
    const a = this.templateForm.get('appearance')?.value ?? {};
    if (a.primaryColor) return a.primaryColor;
    if (a.backgroundGradient) {
      const hex = a.backgroundGradient.match(/#[0-9a-fA-F]{6}/);
      if (hex) return hex[0];
    }
    if (a.backgroundColor) return a.backgroundColor;
    return '#4d8fff';
  }

  private previewHexToRgba(hex: string, alpha: number): string {
    if (!hex?.startsWith('#')) return `rgba(77,143,255,${alpha})`;
    const h = hex.slice(1).length === 3
      ? hex.slice(1).split('').map((c: string) => c + c).join('')
      : hex.slice(1);
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return isNaN(r + g + b) ? `rgba(77,143,255,${alpha})` : `rgba(${r},${g},${b},${alpha})`;
  }

  get previewListPageStyle(): Record<string, string> {
    return this.previewPageStyle;
  }

  get previewListActiveTabStyle(): Record<string, string> {
    const color = this.previewAccentColor;
    return {
      color,
      background: this.previewHexToRgba(color, 0.14),
      border: `1px solid ${this.previewHexToRgba(color, 0.3)}`,
      'border-radius': '8px',
      padding: '5px 12px',
      'font-size': '11px',
      'font-weight': '700',
      cursor: 'default',
      display: 'inline-flex',
      'align-items': 'center',
      gap: '5px',
    };
  }

  get previewListBadgeStyle(): Record<string, string> {
    const color = this.previewAccentColor;
    return {
      background: color,
      color: '#fff',
      'border-radius': '99px',
      padding: '1px 6px',
      'font-size': '9px',
      'font-weight': '700',
    };
  }

  get previewListCardStyle(): Record<string, string> {
    const a = this.templateForm.get('appearance')?.value ?? {};
    const border = a.cardBorderColor
      ? `1px solid ${a.cardBorderColor}`
      : '1px solid rgba(255,255,255,0.1)';
    if (a.cardBackgroundColor) {
      return { background: a.cardBackgroundColor, border, 'border-radius': '7px', overflow: 'hidden' };
    }
    return {
      background: 'rgba(10,16,32,0.55)',
      'backdrop-filter': 'blur(10px)',
      border,
      'border-radius': '7px',
      overflow: 'hidden',
    };
  }

  get previewListHeaderStyle(): Record<string, string> {
    const a = this.templateForm.get('appearance')?.value ?? {};
    const color = this.previewAccentColor;
    // Se cardBackgroundColor definido, header é levemente mais escuro/claro
    if (a.cardBackgroundColor) {
      return {
        background: this.previewHexToRgba(color, 0.15),
        color: this.previewHexToRgba(color, 0.9),
        'border-bottom': `1px solid ${a.cardBorderColor || this.previewHexToRgba(color, 0.2)}`,
      };
    }
    return {
      background: this.previewHexToRgba(color, 0.12),
      color: this.previewHexToRgba(color, 0.85),
      'border-bottom': `1px solid ${this.previewHexToRgba(color, 0.2)}`,
    };
  }

  get previewFields(): { label: string; fieldColor: string; colSpan: number; index: number }[] {
    const f = this.fields.value as { label: string; fieldColor: string; colSpan: number }[];
    if (f.length > 0)
      return f.map((x, i) => ({
        label: x.label || 'Campo',
        fieldColor: x.fieldColor || '',
        colSpan: x.colSpan ?? 2,
        index: i,
      }));
    return [
      { label: 'Nome completo', fieldColor: '', colSpan: 2, index: 0 },
      { label: 'E-mail', fieldColor: '', colSpan: 2, index: 1 },
    ];
  }

  get previewRows(): { label: string; fieldColor: string; colSpan: number; index: number }[][] {
    type Field = { label: string; fieldColor: string; colSpan: number; index: number };
    const fields: Field[] = this.previewFields;
    const result: Field[][] = [];
    let row: Field[] = [];
    let width = 0;
    for (const f of fields) {
      if (width + f.colSpan > 2) {
        result.push(row);
        row = [f];
        width = f.colSpan;
      } else {
        row.push(f);
        width += f.colSpan;
        if (width >= 2) { result.push(row); row = []; width = 0; }
      }
    }
    if (row.length) result.push(row);
    return result;
  }

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
    private cdr: ChangeDetectorRef,
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
        maxDaysAhead: [30, [Validators.min(1), Validators.max(365)]],
      }),
      appearance: this.fb.group({
        backgroundColor: [''],
        backgroundGradient: [''],
        backgroundImageUrl: [''],
        headerImageUrl: [''],
        footerImageUrl: [''],
        primaryColor: [''],
        formTextColor: [''],
        fieldBackgroundColor: [''],
        fieldTextColor: [''],
        cardBackgroundColor: [''],
        cardBorderColor: [''],
      }),
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
      const h = Math.floor(totalStart / 60)
        .toString()
        .padStart(2, '0');
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
        switchMap((params) => {
          const slugParam = params['slug'];
          if (slugParam) {
            this.slug = slugParam;
            this.loading = true;
            return this.templateService.getTemplateBySlug(slugParam);
          }
          return of(null);
        }),
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
        error: () => {
          this.loading = false;
        },
      });
  }

  addField() {
    this.fields.push(
      this.fb.group({
        label: ['', Validators.required],
        type: ['text', Validators.required],
        required: [false],
        fieldColor: [''],
        colSpan: [2],
      }),
    );
  }

  dropField(event: CdkDragDrop<AbstractControl[]>) {
    moveItemInArray(this.fields.controls, event.previousIndex, event.currentIndex);
    this.fields.updateValueAndValidity();
    this.cdr.detectChanges();
  }

  toggleFieldSpan(index: number) {
    const field = this.fields.at(index);
    const current = field.get('colSpan')?.value ?? 2;
    field.get('colSpan')?.setValue(current === 2 ? 1 : 2);
  }

  removeField(i: number) {
    this.fields.removeAt(i);
  }

  loadClients() {
    this.clientService.findAll(0, 100).subscribe({
      next: (res) => {
        this.clients = res.content;
        this.cdr.detectChanges();
      },
      error: () => console.error('Erro ao carregar clientes'),
    });
  }

  // ── Upload no CREATE mode ──────────────────────────────────────
  onPendingFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.parsingFile = true;
    this.pendingAttendanceFileName = file.name;

    this.exportService
      .readExcelFile(file)
      .then((rows) => {
        this.pendingAttendanceRows = rows;
        const keys = new Set<string>();
        rows.forEach((r) => Object.keys(r).forEach((k) => keys.add(k)));
        this.pendingAttendanceCols = Array.from(keys);
        this.parsingFile = false;
        this.cdr.detectChanges();
      })
      .catch(() => {
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
    const rawAppearance = formValue.appearance ?? {};
    const appearance: Record<string, string> = {};
    Object.keys(rawAppearance).forEach((k) => {
      if (rawAppearance[k]) appearance[k] = rawAppearance[k];
    });

    const payload: CreateFormTemplateRequest = {
      name: formValue.name,
      clientId: formValue.clientId,
      fields: formValue.fields.map((f: any) => ({
        label: f.label,
        type: f.type,
        required: f.required,
        ...(f.fieldColor ? { fieldColor: f.fieldColor } : {}),
        colSpan: f.colSpan ?? 2,
      })),
      scheduleConfig: formValue.hasSchedule
        ? {
            startTime: formValue.scheduleConfig.startTime + ':00',
            endTime: formValue.scheduleConfig.endTime + ':00',
            slotDurationMinutes: formValue.scheduleConfig.slotDurationMinutes,
            maxDaysAhead: formValue.scheduleConfig.maxDaysAhead,
          }
        : null,
      appearance: Object.keys(appearance).length > 0 ? appearance : null,
    };

    this.templateService.createTemplate(payload.clientId, payload).subscribe({
      next: (res: FormTemplate) => {
        this.template = res;
        this.slug = res.slug;
        this.loadTemplateToForm(res);

        // Se tem lista pendente, importa logo após criar
        if (formValue.hasAttendance && this.pendingAttendanceRows.length > 0) {
          this.importingAttendance = true;
          this.templateService
            .importAttendance(res.id, { rows: this.pendingAttendanceRows })
            .subscribe({
              next: (records) => {
                this.setAttendanceRecords(records);
                this.importingAttendance = false;
                this.cdr.detectChanges();
              },
              error: () => {
                alert('Template criado, mas houve erro ao importar a lista de presença.');
                this.importingAttendance = false;
              },
            });
        }
      },
      error: (err) => {
        alert(
          `Erro ao criar template (${err.status}): ${err.error?.message ?? 'Verifique o console'}`,
        );
      },
    });
  }

  loadTemplateToForm(template: FormTemplate) {
    this.templateForm.patchValue({
      name: template.name,
      clientId: (template as any).clientId ?? null,
      hasSchedule: template.hasSchedule,
    });

    if (template.hasSchedule && template.scheduleConfig) {
      this.scheduleConfig.patchValue({
        startTime: template.scheduleConfig.startTime.substring(0, 5),
        endTime: template.scheduleConfig.endTime.substring(0, 5),
        slotDurationMinutes: template.scheduleConfig.slotDurationMinutes,
        maxDaysAhead: template.scheduleConfig.maxDaysAhead,
      });
    }

    if (template.appearance) {
      this.templateForm.get('appearance')?.patchValue(template.appearance);
    }

    this.fields.clear();
    template.fields.forEach((f) => {
      this.fields.push(
        this.fb.group({
          label: [f.label, Validators.required],
          type: [f.type, Validators.required],
          required: [f.required ?? false],
          fieldColor: [f.fieldColor ?? ''],
          colSpan: [(f as any).colSpan ?? 2],
        }),
      );
    });

    this.cdr.detectChanges();
  }

  // ── Attendance (view mode) ─────────────────────────────────────
  loadAttendance(templateId: number) {
    this.templateService
      .getAttendance(templateId)
      .pipe(map((p) => p.content))
      .subscribe({
        next: (records) => this.setAttendanceRecords(records),
        error: () => {},
      });
  }

  onAttendanceFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.template) return;

    this.importingAttendance = true;
    this.exportService
      .readExcelFile(file)
      .then((rows) => {
        this.templateService.importAttendance(this.template!.id, { rows }).subscribe({
          next: (records) => {
            this.setAttendanceRecords(records);
            this.importingAttendance = false;
            this.cdr.detectChanges();
          },
          error: () => {
            alert('Erro ao importar planilha.');
            this.importingAttendance = false;
          },
        });
      })
      .catch(() => {
        alert('Arquivo inválido. Use .xlsx ou .xls');
        this.importingAttendance = false;
      });

    input.value = '';
  }

  private setAttendanceRecords(records: AttendanceRecord[]) {
    this.attendanceRecords = records;
    const keys = new Set<string>();
    records.forEach((r) => Object.keys(r.rowData || {}).forEach((k) => keys.add(k)));
    this.attendanceCols = Array.from(keys);
    this.cdr.detectChanges();
  }

  exportAttendance() {
    if (!this.template) return;
    this.exportService.exportAttendance(this.attendanceRecords, this.template.name);
  }

  get formLink(): string {
    const slug = this.template?.slug ?? '';
    if (this.template?.hasAttendance) return `/forms/${slug}/list`;
    return `/forms/${slug}`;
  }
}
