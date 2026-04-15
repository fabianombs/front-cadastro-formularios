import { Component, OnInit, ChangeDetectorRef, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  FormTemplateService,
  FormTemplate,
  CreateFormTemplateRequest,
  UpdateFormTemplateRequest,
  AttendanceRecord,
} from '../../core/services/form-template.service';
import { MessageService } from '../../core/services/message.service';
import { ClientService, Client } from '../../core/services/client.service';
import { ExportService } from '../../core/services/export.service';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { map } from 'rxjs/operators';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { AbstractControl } from '@angular/forms';
import { FormFieldComponent } from '../../shared/components/form-field/form-field.component';
import {
  ImagePositionModalComponent,
  ImagePositionConfig,
} from '../../shared/components/image-position-modal/image-position-modal.component';

@Component({
  selector: 'app-create-template',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, DragDropModule, PageShellComponent, PageHeaderComponent, FormFieldComponent, ImagePositionModalComponent],
  templateUrl: './create-form-template.component.html',
  styleUrls: ['./create-form-template.component.scss'],
})
export class CreateTemplateComponent implements OnInit {
  public templateForm: FormGroup;
  public clients: Client[] = [];

  public template: FormTemplate | null = null;
  public slug: string | null = null;
  public loading = false;
  public editMode = false;
  public showAppearance = false;
  public editingSchedule = false;
  public savingSchedule = false;

  // Upload state: qual campo está fazendo upload e preview local
  uploadingField = signal<string | null>(null);
  imagePreviews: Record<string, string> = {};

  // Image position modal
  imagePositionConfig: ImagePositionConfig | null = null;
  private pendingImageInput: HTMLInputElement | null = null;

  private readonly CANVAS_DIMS: Record<string, { w: number; h: number; label: string }> = {
    backgroundImageUrl: { w: 1200, h: 400, label: 'Fundo' },
    headerImageUrl:     { w: 1200, h: 220, label: 'Topo' },
    footerImageUrl:     { w: 1200, h: 180, label: 'Rodapé' },
  };

  private messages = inject(MessageService);

  readonly fontOptions = [
    { label: 'Padrão', value: '', weights: '' },
    { label: 'Inter', value: 'Inter', weights: '400;500;600;700' },
    { label: 'Poppins', value: 'Poppins', weights: '400;500;600;700' },
    { label: 'Roboto', value: 'Roboto', weights: '400;500;700' },
    { label: 'Montserrat', value: 'Montserrat', weights: '400;500;700;800' },
    { label: 'Lato', value: 'Lato', weights: '400;700' },
    { label: 'Playfair', value: 'Playfair Display', weights: '400;700' },
    { label: 'Space Grotesk', value: 'Space Grotesk', weights: '400;500;700' },
  ];

  private loadGoogleFont(family: string, weights: string): void {
    if (!family) return;
    const id = `gf-${family.replace(/\s+/g, '-').toLowerCase()}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, '+')}:wght@${weights}&display=swap`;
    document.head.appendChild(link);
  }

  setFont(opt: { value: string; weights: string }): void {
    const ctrl = this.templateForm.get('appearance.fontFamily');
    if (ctrl?.value === opt.value) {
      ctrl.setValue('');
    } else {
      if (opt.value) this.loadGoogleFont(opt.value, opt.weights);
      ctrl?.setValue(opt.value);
    }
    this.cdr.detectChanges();
  }

  readonly titleFontSizes = [
    { label: 'P', px: '14px', uiSize: '12px' },
    { label: 'M', px: '18px', uiSize: '15px' },
    { label: 'G', px: '22px', uiSize: '18px' },
    { label: 'GG', px: '28px', uiSize: '22px' },
  ];

  readonly labelFontSizes = [
    { label: 'P', px: '10px', uiSize: '10px' },
    { label: 'M', px: '12px', uiSize: '12px' },
    { label: 'G', px: '14px', uiSize: '14px' },
    { label: 'GG', px: '16px', uiSize: '16px' },
  ];

  readonly buttonFontSizes = [
    { label: 'P', px: '10px', uiSize: '10px' },
    { label: 'M', px: '13px', uiSize: '12px' },
    { label: 'G', px: '15px', uiSize: '14px' },
    { label: 'GG', px: '17px', uiSize: '16px' },
  ];

  setFontSize(field: 'titleFontSize' | 'labelFontSize' | 'buttonFontSize', px: string) {
    const ctrl = this.templateForm.get(`appearance.${field}`);
    if (ctrl?.value === px) {
      ctrl.setValue('');
    } else {
      ctrl?.setValue(px);
    }
  }

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
    this.imagePreviews['backgroundImageUrl'] = '';
  }

  /** Abre o modal de posicionamento ao selecionar uma imagem */
  onImageFileChange(
    field: 'headerImageUrl' | 'footerImageUrl' | 'backgroundImageUrl',
    event: Event,
  ) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.pendingImageInput = input;

    const reader = new FileReader();
    reader.onload = () => {
      const dims = this.CANVAS_DIMS[field];
      this.imagePositionConfig = {
        field,
        dataUrl: reader.result as string,
        canvasWidth: dims.w,
        canvasHeight: dims.h,
        label: dims.label,
        fillColor: this.resolveFillColor(),
      };
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  /**
   * Resolve a cor de fundo ativa no formulário de aparência.
   * Prioridade: backgroundColor > primeira cor do backgroundGradient > branco.
   */
  private resolveFillColor(): string {
    const bg = this.templateForm.get('appearance.backgroundColor')?.value;
    // Usa apenas a cor de fundo sólida definida pelo usuário.
    // Gradientes e valores ausentes não geram cor automática — fill neutro transparente.
    return bg || 'transparent';
  }

  /** Usuário confirmou o posicionamento — recebe o blob recortado e faz upload */
  onImagePositionConfirmed(event: { blob: Blob; field: string }): void {
    const field = event.field as 'headerImageUrl' | 'footerImageUrl' | 'backgroundImageUrl';
    const isPng  = event.blob.type === 'image/png';
    const croppedFile = new File(
      [event.blob],
      isPng ? 'image.png' : 'image.jpg',
      { type: event.blob.type },
    );

    this.imagePositionConfig = null;

    // Preview imediato com blob URL
    const blobUrl = URL.createObjectURL(event.blob);
    this.imagePreviews[field] = blobUrl;
    this.cdr.detectChanges();

    // Upload para o backend
    this.uploadingField.set(field);
    this.templateService.uploadImage(croppedFile).subscribe({
      next: ({ url }) => {
        this.imagePreviews[field] = url;
        this.templateForm.get(`appearance.${field}`)?.setValue(url);
        URL.revokeObjectURL(blobUrl);
        this.uploadingField.set(null);
        if (field === 'backgroundImageUrl') {
          this.templateForm.get('appearance.backgroundGradient')?.setValue('');
          this.templateForm.get('appearance.backgroundColor')?.setValue('');
        }
        this.cdr.detectChanges();
      },
      error: () => {
        URL.revokeObjectURL(blobUrl);
        this.uploadingField.set(null);
        this.imagePreviews[field] = '';
        if (this.pendingImageInput) this.pendingImageInput.value = '';
        this.messages.error('Erro ao enviar imagem. Tente novamente.');
        this.cdr.detectChanges();
      },
    });
  }

  /** Usuário cancelou o modal — limpa tudo sem fazer upload */
  onImagePositionCancelled(): void {
    this.imagePositionConfig = null;
    if (this.pendingImageInput) {
      this.pendingImageInput.value = '';
      this.pendingImageInput = null;
    }
    this.cdr.detectChanges();
  }

  clearImage(field: 'headerImageUrl' | 'footerImageUrl' | 'backgroundImageUrl') {
    this.deleteSessionImage(field);
    this.templateForm.get(`appearance.${field}`)?.setValue('');
    this.imagePreviews[field] = '';
  }

  /**
   * Deleta imediatamente do servidor uma imagem que foi enviada nesta sessão
   * (ou seja, que está em imagePreviews mas ainda não foi salva no template em banco).
   * Imagens já salvas são gerenciadas pelo backend em updateTemplate via tryDeleteOrphanedImage.
   */
  private deleteSessionImage(field: 'headerImageUrl' | 'footerImageUrl' | 'backgroundImageUrl') {
    const sessionUrl = this.imagePreviews[field];
    const savedUrl = this.template?.appearance?.[field];
    // Ignora blob URLs (preview local antes do upload terminar) — só deleta URLs reais do servidor
    if (sessionUrl && !sessionUrl.startsWith('blob:') && sessionUrl !== savedUrl) {
      this.templateService.deleteImage(sessionUrl).subscribe({ error: () => {} });
    }
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
    if (a.fontFamily) style['font-family'] = `'${a.fontFamily}', sans-serif`;
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
    if (a.fieldBorderColor) style['borderColor'] = a.fieldBorderColor;
    return style;
  }

  get previewBtnStyle(): Record<string, string> {
    const a = this.templateForm.get('appearance')?.value ?? {};
    const style: Record<string, string> = {};
    if (a.primaryColor) {
      style['background-color'] = a.primaryColor;
      style['border-color'] = a.primaryColor;
    }
    if (a.buttonFontSize) style['font-size'] = a.buttonFontSize;
    if (a.fontFamily) style['font-family'] = `'${a.fontFamily}', sans-serif`;
    return style;
  }

  get previewTitleStyle(): Record<string, string> {
    const a = this.templateForm.get('appearance')?.value ?? {};
    const style: Record<string, string> = {};
    if (a.titleFontSize) style['font-size'] = a.titleFontSize;
    if (a.fontFamily) style['font-family'] = `'${a.fontFamily}', sans-serif`;
    if (a.formTextColor) style['color'] = a.formTextColor;
    return style;
  }

  get previewLabelStyle(): Record<string, string> {
    const a = this.templateForm.get('appearance')?.value ?? {};
    const style: Record<string, string> = {};
    if (a.labelFontSize) style['font-size'] = a.labelFontSize;
    if (a.fontFamily) style['font-family'] = `'${a.fontFamily}', sans-serif`;
    return style;
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
        slotCapacity: [10, [Validators.required, Validators.min(1)]],
        dedupFields: [[] as string[]],
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
        fieldBorderColor: [''],
        cardBackgroundColor: [''],
        cardBorderColor: [''],
        titleFontSize: [''],
        labelFontSize: [''],
        buttonFontSize: [''],
        fontFamily: [''],
      }),
    });
  }

  get fields(): FormArray {
    return this.templateForm.get('fields') as FormArray;
  }

  get nameControl(): FormControl {
    return this.templateForm.get('name') as FormControl;
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

  /** Labels de todos os campos adicionados ao formulário */
  get fieldLabels(): string[] {
    return this.fields.controls
      .map(fg => fg.get('label')?.value as string)
      .filter(label => !!label?.trim());
  }

  /** Verifica se um campo está marcado como chave de dedup */
  isDedupField(label: string): boolean {
    const arr: string[] = this.scheduleConfig.get('dedupFields')?.value ?? [];
    return arr.includes(label);
  }

  /** Alterna a seleção de um campo como chave de dedup */
  toggleDedupField(label: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const ctrl = this.scheduleConfig.get('dedupFields')!;
    const arr: string[] = [...(ctrl.value ?? [])];
    if (checked && !arr.includes(label)) {
      arr.push(label);
    } else if (!checked) {
      const idx = arr.indexOf(label);
      if (idx >= 0) arr.splice(idx, 1);
    }
    ctrl.setValue(arr);
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

    const slugParam = this.route.snapshot.params['slug'];
    if (slugParam) {
      this.slug = slugParam;
      this.editMode = true;
      this.loading = true;
      this.templateService.getTemplateBySlug(slugParam).subscribe({
        next: (res) => {
          this.template = res;
          this.loadTemplateToForm(res);
          this.templateForm.get('clientId')?.disable();
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
    }
  }

  addField() {
    this.fields.push(
      this.fb.group({
        label: ['', Validators.required],
        type: ['text', Validators.required],
        required: [false],
        fieldColor: [''],
        colSpan: [2],
        options: this.fb.array([]),
      }),
    );
  }

  getFieldOptions(index: number): FormArray {
    const field = this.fields.at(index);
    if (!field) return this.fb.array([]);
    const ctrl = field.get('options');
    if (!ctrl) {
      const arr = this.fb.array([]);
      (field as FormGroup).addControl('options', arr);
      return arr;
    }
    return ctrl as FormArray;
  }

  addOption(index: number) {
    this.getFieldOptions(index).push(this.fb.control('', Validators.required));
  }

  removeOption(fieldIndex: number, optIndex: number) {
    this.getFieldOptions(fieldIndex).removeAt(optIndex);
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
        this.messages.warning('Arquivo inválido. Use .xlsx ou .xls');
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
    const IMAGE_FIELDS = new Set(['backgroundImageUrl', 'headerImageUrl', 'footerImageUrl']);
    const appearance: Record<string, string> = {};
    Object.keys(rawAppearance).forEach((k) => {
      if (rawAppearance[k] || IMAGE_FIELDS.has(k)) appearance[k] = rawAppearance[k] ?? '';
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
        ...(f.type === 'select' && f.options?.length ? { options: f.options } : {}),
      })),
      scheduleConfig: formValue.hasSchedule
        ? {
            startTime: formValue.scheduleConfig.startTime + ':00',
            endTime: formValue.scheduleConfig.endTime + ':00',
            slotDurationMinutes: formValue.scheduleConfig.slotDurationMinutes,
            maxDaysAhead: formValue.scheduleConfig.maxDaysAhead,
            slotCapacity: formValue.scheduleConfig.slotCapacity,
            dedupFields: formValue.scheduleConfig.dedupFields ?? [],
          }
        : null,
      appearance: Object.keys(appearance).length > 0 ? appearance : null,
    };

    // ── MODO EDIÇÃO ─────────────────────────────────────────────
    if (this.template) {
      const updatePayload: UpdateFormTemplateRequest = {
        name: formValue.name,
        fields: formValue.fields.map((f: any) => ({
          label: f.label,
          type: f.type,
          required: f.required,
          ...(f.fieldColor ? { fieldColor: f.fieldColor } : {}),
          colSpan: f.colSpan ?? 2,
          ...(f.type === 'select' && f.options?.length ? { options: f.options } : {}),
        })),
        appearance: Object.keys(appearance).length > 0 ? appearance : null,
      };

      this.templateService.updateTemplate(this.template.id, updatePayload).subscribe({
        next: (res: FormTemplate) => {
          this.template = res;
          this.loadTemplateToForm(res);
          this.editMode = false;
          this.messages.success('Template atualizado com sucesso!');
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.messages.error(
            `Erro ao atualizar template (${err.status}): ${err.error?.message ?? 'Verifique o console'}`,
          );
        },
      });
      return;
    }

    // ── MODO CRIAÇÃO ─────────────────────────────────────────────
    this.templateService.createTemplate(payload.clientId, payload).subscribe({
      next: (res: FormTemplate) => {
        this.template = res;
        this.slug = res.slug;
        this.loadTemplateToForm(res);
        this.messages.success('Template criado com sucesso!');

        // Preserva configuração dos campos select no sessionStorage
        // (o importAttendance pode sobrescrever os fields no backend)
        const selectCache: Record<string, string[]> = {};
        res.fields.forEach(f => {
          if (f.type === 'select' && f.options?.length) {
            selectCache[f.label] = f.options;
          }
        });
        if (Object.keys(selectCache).length > 0) {
          sessionStorage.setItem(`tmpl-select-${res.slug}`, JSON.stringify(selectCache));
        }

        // Se tem lista pendente, importa logo após criar
        if (formValue.hasAttendance && this.pendingAttendanceRows.length > 0) {
          this.importingAttendance = true;
          this.templateService
            .importAttendance(res.id, { rows: this.pendingAttendanceRows })
            .subscribe({
              next: (records) => {
                this.setAttendanceRecords(records);
                this.importingAttendance = false;
                if (this.template) this.template.hasAttendance = true;
                this.cdr.detectChanges();
              },
              error: () => {
                this.messages.error('Template criado, mas houve erro ao importar a lista de presença.');
                this.importingAttendance = false;
              },
            });
        }
      },
      error: (err) => {
        this.messages.error(
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
        slotCapacity: template.scheduleConfig.slotCapacity ?? 1,
        dedupFields: template.scheduleConfig.dedupFields ?? [],
      });
    }

    if (template.appearance) {
      this.templateForm.get('appearance')?.patchValue(template.appearance);
      if (template.appearance.fontFamily) {
        const opt = this.fontOptions.find(o => o.value === template.appearance!.fontFamily);
        if (opt?.weights) this.loadGoogleFont(opt.value, opt.weights);
      }
    }

    this.fields.clear();
    template.fields.forEach((f) => {
      const optionsArray = this.fb.array(
        (f.options ?? []).map((o) => this.fb.control(o, Validators.required)),
      );
      this.fields.push(
        this.fb.group({
          label: [f.label, Validators.required],
          type: [f.type, Validators.required],
          required: [f.required ?? false],
          fieldColor: [f.fieldColor ?? ''],
          colSpan: [(f as any).colSpan ?? 2],
          options: optionsArray,
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
        // Captura a ordem das colunas do Excel antes de enviar ao backend,
        // pois o backend pode retornar rowData com chaves em ordem diferente.
        const excelColOrder = rows.length ? Object.keys(rows[0]) : [];
        this.templateService.importAttendance(this.template!.id, { rows }).subscribe({
          next: (records) => {
            this.setAttendanceRecords(records, excelColOrder);
            this.importingAttendance = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.messages.error('Erro ao importar planilha.');
            this.importingAttendance = false;
          },
        });
      })
      .catch(() => {
        this.messages.warning('Arquivo inválido. Use .xlsx ou .xls');
        this.importingAttendance = false;
      });

    input.value = '';
  }

  private setAttendanceRecords(records: AttendanceRecord[], colOrder: string[] = []) {
    this.attendanceRecords = records;
    if (colOrder.length) {
      this.attendanceCols = colOrder;
    } else {
      const keys = new Set<string>();
      records.forEach((r) => Object.keys(r.rowData || {}).forEach((k) => keys.add(k)));
      this.attendanceCols = Array.from(keys);
    }
    this.cdr.detectChanges();
  }

  saveScheduleConfig() {
    if (!this.template) return;
    this.savingSchedule = true;

    const sc = this.scheduleConfig.value;
    const config = {
      startTime: sc.startTime + ':00',
      endTime: sc.endTime + ':00',
      slotDurationMinutes: sc.slotDurationMinutes,
      maxDaysAhead: sc.maxDaysAhead,
      slotCapacity: sc.slotCapacity > 0 ? sc.slotCapacity : 1,
      dedupFields: sc.dedupFields ?? [],
    };

    this.templateService.updateScheduleConfig(this.template.id, config).subscribe({
      next: (res) => {
        this.template = res;
        this.loadTemplateToForm(res);
        this.editingSchedule = false;
        this.savingSchedule = false;
        this.messages.success('Configuração de agenda atualizada!');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.messages.error(err.error?.message ?? 'Erro ao salvar configuração.');
        this.savingSchedule = false;
      },
    });
  }

  exportAttendance() {
    if (!this.template) return;
    this.exportService.exportAttendance(this.attendanceRecords, this.template.name);
  }

  // ── Auto-contraste ────────────────────────────────────────────
  /** Retorna branco ou escuro dependendo da luminância do hex */
  getContrastColor(hex: string): string {
    if (!hex?.startsWith('#') || hex.length < 7) return '#f0f4f9';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? '#18283e' : '#f0f4f9';
  }

  /** Aplica cor de texto com melhor contraste para o fundo atual */
  applyAutoContrast() {
    const ap = this.templateForm.get('appearance');
    const bg = ap?.get('backgroundColor')?.value as string;
    const gradient = ap?.get('backgroundGradient')?.value as string;
    let hex = bg;
    if (!hex && gradient) {
      const match = gradient.match(/#[0-9a-fA-F]{6}/);
      hex = match?.[0] ?? '';
    }
    if (!hex) return;
    const text = this.getContrastColor(hex);
    ap?.get('formTextColor')?.setValue(text);
    ap?.get('fieldTextColor')?.setValue(text);
  }

  get hasBgSelected(): boolean {
    const a = this.templateForm.get('appearance')?.value ?? {};
    return !!(a.backgroundColor || a.backgroundGradient || a.backgroundImageUrl);
  }

  clearAppearanceField(field: string) {
    this.templateForm.get(`appearance.${field}`)?.setValue('');
    if (field in this.imagePreviews) this.imagePreviews[field] = '';
  }

  /** Atualiza preview em tempo real enquanto o usuário arrasta o color picker */
  onColorLiveChange(controlName: string, event: Event) {
    const hex = (event.target as HTMLInputElement).value;
    this.templateForm.get(`appearance.${controlName}`)?.setValue(hex, { emitEvent: false });
    // Ao escolher cor sólida de fundo, remove gradiente e imagem para não sobrepor
    if (controlName === 'backgroundColor' && hex) {
      this.templateForm.get('appearance.backgroundGradient')?.setValue('', { emitEvent: false });
      this.templateForm.get('appearance.backgroundImageUrl')?.setValue('', { emitEvent: false });
      this.imagePreviews['backgroundImageUrl'] = '';
    }
    this.cdr.detectChanges();
  }

  get slugLink(): string {
    return `/forms/${this.template?.slug ?? ''}`;
  }

  get listLink(): string {
    return `/forms/${this.template?.slug ?? ''}/list`;
  }

  copyLink(path: string): void {
    const url = window.location.origin + path;
    navigator.clipboard.writeText(url).then(
      () => this.messages.success('Link copiado!'),
      () => this.messages.error('Não foi possível copiar o link.'),
    );
  }
}
