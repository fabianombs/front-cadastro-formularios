import { Component, OnInit, ChangeDetectorRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  FormTemplateService,
  FormTemplate,
  FormSubmission,
  AttendanceRecord,
  AppointmentResponse,
} from '../../core/services/form-template.service';
import { ExportService } from '../../core/services/export.service';
import { map } from 'rxjs/operators';

type Tab = 'submissions' | 'attendance' | 'appointments';

@Component({
  selector: 'app-template-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './template-view.component.html',
  styleUrls: ['./template-view.component.scss'],
})
export class TemplateViewComponent implements OnInit {

  template = signal<FormTemplate | null>(null);
  loading  = signal(true);
  error    = signal('');

  submissions  = signal<FormSubmission[]>([]);
  attendance   = signal<AttendanceRecord[]>([]);
  appointments = signal<AppointmentResponse[]>([]);

  activeTab = signal<Tab>('submissions');

  // Colunas da tabela de presença derivadas dos dados
  attendanceCols = computed<string[]>(() => {
    const keys = new Set<string>();
    this.attendance().forEach(r => Object.keys(r.rowData).forEach(k => keys.add(k)));
    return Array.from(keys);
  });

  // Colunas do formulário para a tabela de respostas
  submissionCols = computed<string[]>(() =>
    (this.template()?.fields ?? []).map(f => f.label)
  );

  private readonly templateService = inject(FormTemplateService);
  private readonly exportService   = inject(ExportService);
  private readonly route           = inject(ActivatedRoute);
  private readonly cdr             = inject(ChangeDetectorRef);

  // viewToken da rota — guardado para usar nas chamadas de dados públicos
  private viewToken = '';

  ngOnInit(): void {
    const token = this.route.snapshot.params['viewToken'] as string | undefined;
    if (!token) {
      this.error.set('Token de visualização inválido.');
      this.loading.set(false);
      return;
    }
    this.viewToken = token;

    this.templateService.getTemplateByViewToken(token).subscribe({
      next: (tmpl) => {
        this.template.set(tmpl);
        this.loading.set(false);

        // Seleciona a primeira aba habilitada
        if (tmpl.viewShowSubmissions)       this.activeTab.set('submissions');
        else if (tmpl.viewShowAttendance)   this.activeTab.set('attendance');
        else if (tmpl.viewShowAppointments) this.activeTab.set('appointments');

        // Carrega dados via endpoints públicos — não exigem JWT
        this.loadData(tmpl);
        this.cdr.detectChanges();
      },
      error: () => {
        this.error.set('Link de visualização inválido ou expirado.');
        this.loading.set(false);
        this.cdr.detectChanges();
      },
    });
  }

  private loadData(tmpl: FormTemplate): void {
    // error: () => {} — erros de dados (401, 404) não quebram a tela; mostra lista vazia
    if (tmpl.viewShowSubmissions) {
      this.templateService
        .getSubmissionsByViewToken(this.viewToken)
        .pipe(map(p => p.content))
        .subscribe({
          next: data => { this.submissions.set(data); this.cdr.detectChanges(); },
          error: () => {},
        });
    }

    if (tmpl.viewShowAttendance && tmpl.hasAttendance) {
      this.templateService
        .getAttendanceByViewToken(this.viewToken)
        .pipe(map(p => p.content))
        .subscribe({
          next: data => { this.attendance.set(data); this.cdr.detectChanges(); },
          error: () => {},
        });
    }

    if (tmpl.viewShowAppointments && tmpl.hasSchedule) {
      this.templateService
        .getAppointmentsByViewToken(this.viewToken)
        .pipe(map(p => p.content))
        .subscribe({
          next: data => { this.appointments.set(data); this.cdr.detectChanges(); },
          error: () => {},
        });
    }
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  isActive(tab: Tab): boolean {
    return this.activeTab() === tab;
  }

  // Estilo inline da aba ativa (evita CSS custom property que quebra strictTemplates)
  activeTabStyle(tab: Tab): Record<string, string> {
    if (!this.isActive(tab)) return {};
    const color = this.accentColor;
    return { borderColor: color, color };
  }

  exportSubmissions(): void {
    const tmpl = this.template();
    if (!tmpl) return;
    this.exportService.exportSubmissions(this.submissions(), tmpl.name, this.submissionCols());
  }

  exportAttendance(): void {
    const tmpl = this.template();
    if (!tmpl) return;
    this.exportService.exportAttendance(this.attendance(), tmpl.name);
  }

  get headerImageUrl(): string {
    return this.template()?.appearance?.headerImageUrl ?? '';
  }

  get footerImageUrl(): string {
    return this.template()?.appearance?.footerImageUrl ?? '';
  }

  get accentColor(): string {
    return this.template()?.appearance?.primaryColor ?? '#4d8fff';
  }

  get pageStyle(): Record<string, string> {
    const a = this.template()?.appearance;
    const style: Record<string, string> = { 'min-height': '100vh' };
    if (a?.backgroundGradient)        style['background'] = a.backgroundGradient;
    else if (a?.backgroundImageUrl)   { style['backgroundImage'] = `url(${a.backgroundImageUrl})`; style['backgroundSize'] = 'cover'; style['backgroundPosition'] = 'center'; }
    else if (a?.backgroundColor)      style['backgroundColor'] = a.backgroundColor;
    else                              style['backgroundColor'] = '#0d1224';
    if (a?.formTextColor)  style['color'] = a.formTextColor;
    if (a?.fontFamily)     style['fontFamily'] = `'${a.fontFamily}', sans-serif`;
    return style;
  }

  get cardStyle(): Record<string, string> {
    const a = this.template()?.appearance;
    if (a?.cardBackgroundColor) {
      return { background: a.cardBackgroundColor, border: `1px solid ${a.cardBorderColor ?? 'rgba(255,255,255,0.1)'}` };
    }
    return { background: 'rgba(255,255,255,0.04)', 'backdrop-filter': 'blur(12px)', border: '1px solid rgba(255,255,255,0.09)' };
  }
}
