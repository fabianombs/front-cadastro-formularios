import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  signal,
  inject,
  computed,
  ChangeDetectorRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import {
  Chart,
  ChartConfiguration,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  DashboardService,
  DashboardSummary,
  TemplateStatResponse,
} from '../../core/services/dashboard.service';
import { MessageService } from '../../core/services/message.service';
import {
  PaginationComponent,
  SpringPage,
} from '../../shared/components/pagination/pagination.component';
import {
  DataTableComponent,
  DataTableColumn,
} from '../../shared/components/data-table/data-table.component';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

type KpiType = 'formulario' | 'agendamento' | 'lista-presenca';

export interface KpiCard {
  type: KpiType;
  label: string;
  totalTemplates: number;
  submissoes: number;
  agendamentos: number;
  confirmados: number;
  presencaTotal: number;
  presencaPresente: number;
  presencaPercent: number;
}

@Component({
  selector: 'app-home',
  imports: [CommonModule, FormsModule, PaginationComponent, DataTableComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  private _chartCanvas?: ElementRef<HTMLCanvasElement>;

  @ViewChild('chartCanvas')
  set chartCanvas(el: ElementRef<HTMLCanvasElement>) {
    this._chartCanvas = el;
    if (el) {
      this.renderChart();
    }
  }

  templates: TemplateStatResponse[] = [];
  summary: DashboardSummary | null = null;
  loadingData = false;

  homeColumns: DataTableColumn[] = [
    { key: 'clientName', label: 'Cliente' },
    { key: 'name', label: 'Nome' },
    { key: 'type', label: 'Tipo' },
    { key: 'submissionCount', label: 'Submissões' },
    { key: 'total', label: 'Total' },
    { key: 'confirmedOrPresent', label: 'Confirmados / Presentes' },
    { key: 'presence', label: 'Presença' },
  ];

  search = signal('');
  typeFilter = signal<'all' | 'formulario' | 'agendamento' | 'lista-presenca'>('all');

  filteredTemplates = computed(() => {
    const search = this.search().toLowerCase().trim();
    return this.templates.filter((t) => {
      const type = this.inferType(t);
      const matchesType = this.typeFilter() === 'all' || type === this.typeFilter();
      if (!matchesType) return false;
      if (!search) return true;
      return (
        t.clientName?.toLowerCase().includes(search) ||
        t.name.toLowerCase().includes(search) ||
        type.toLowerCase().includes(search) ||
        String(t.submissionCount).includes(search) ||
        String(t.appointmentTotal).includes(search) ||
        String(t.attendanceTotal ?? '').includes(search)
      );
    });
  });

  // Carregado uma vez, independente da paginação — usado nos KPI cards
  private allTemplatesGlobal = signal<TemplateStatResponse[]>([]);

  readonly pageSize = 5;
  pagination: SpringPage = { page: 0, size: this.pageSize, totalElements: 0, totalPages: 0 };

  private _selected = signal<TemplateStatResponse | null>(null);
  private chart: Chart | null = null;
  private destroy$ = new Subject<void>();

  private messages = inject(MessageService);

  constructor(
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadGlobalStats();
    this.loadData();
  }

  // Busca todos os templates de uma vez para calcular os KPI cards globais
  loadGlobalStats(): void {
    this.dashboardService
      .getSummary(0, 99999)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (data) => this.allTemplatesGlobal.set(data.templates) });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.chart?.destroy();
  }

  loadData(page = this.pagination.page): void {
    this.loadingData = true;
    this.dashboardService
      .getSummary(page, this.pagination.size)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.summary = data;
          this.templates = data.templates;
          this.pagination = {
            page: data.page,
            size: data.size,
            totalElements: data.totalElements,
            totalPages: data.totalPages,
          };
          this.loadingData = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingData = false;
        },
      });
  }

  onPageChange(page: number): void {
    this._selected.set(null);
    this.loadData(page);
    this.cdr.detectChanges();
  }

  clearHomeFilters(): void {
    this.search.set('');
    this.typeFilter.set('all');
  }

  selected(): TemplateStatResponse | null {
    return this._selected();
  }

  selectTemplate(t: TemplateStatResponse): void {
    this._selected.set(t);
    this.renderChart();
  }

  homeRowClass = (t: TemplateStatResponse) => ({
    active: this.selected()?.id === t.id,
  });

  showAll(): void {
    this._selected.set(null);
    this.renderChart();
  }

  // Infere o tipo do template a partir dos campos do backend
  inferType(t: TemplateStatResponse): KpiType {
    if (t.hasSchedule) return 'agendamento';
    if ((t.attendanceTotal ?? 0) > 0) return 'lista-presenca';
    return 'formulario';
  }

  attendancePercent(t: TemplateStatResponse): number {
    const type = this.inferType(t);
    if (type === 'agendamento') {
      return t.appointmentTotal ? (t.appointmentConfirmed / t.appointmentTotal) * 100 : 0;
    }
    if (type === 'lista-presenca') {
      return t.attendanceTotal ? (t.attendancePresent / t.attendanceTotal) * 100 : 0;
    }
    return 0;
  }

  kpiCards(): KpiCard[] {
    // Usa allTemplatesGlobal para que os totais não mudem com a paginação da tabela
    const byType = (type: KpiType) =>
      this.allTemplatesGlobal().filter((t) => this.inferType(t) === type);

    const formulario = byType('formulario');
    const agendamento = byType('agendamento');
    const presenca = byType('lista-presenca');

    const totalFormSubs = formulario.reduce((acc, t) => acc + t.submissionCount, 0);
    const totalAgendTotal = agendamento.reduce((acc, t) => acc + t.appointmentTotal, 0);
    const totalAgendConf = agendamento.reduce((acc, t) => acc + t.appointmentConfirmed, 0);
    const totalPresTotal = presenca.reduce((acc, t) => acc + (t.attendanceTotal ?? 0), 0);
    const totalPresPres = presenca.reduce((acc, t) => acc + (t.attendancePresent ?? 0), 0);

    return [
      {
        type: 'formulario',
        label: 'Formulários',
        totalTemplates: formulario.length,
        submissoes: totalFormSubs,
        agendamentos: 0,
        confirmados: 0,
        presencaTotal: 0,
        presencaPresente: 0,
        presencaPercent: 0,
      },
      {
        type: 'agendamento',
        label: 'Agendamentos',
        totalTemplates: agendamento.length,
        submissoes: 0,
        agendamentos: totalAgendTotal,
        confirmados: totalAgendConf,
        presencaTotal: 0,
        presencaPresente: 0,
        presencaPercent: totalAgendTotal ? (totalAgendConf / totalAgendTotal) * 100 : 0,
      },
      {
        type: 'lista-presenca',
        label: 'Lista de Presença',
        totalTemplates: presenca.length,
        submissoes: 0,
        agendamentos: 0,
        confirmados: 0,
        presencaTotal: totalPresTotal,
        presencaPresente: totalPresPres,
        presencaPercent: totalPresTotal ? (totalPresPres / totalPresTotal) * 100 : 0,
      },
    ];
  }

  templateCard(t: TemplateStatResponse): KpiCard {
    const type = this.inferType(t);
    return {
      type,
      label: t.name,
      totalTemplates: 1,
      submissoes: t.submissionCount,
      agendamentos: t.appointmentTotal,
      confirmados: t.appointmentConfirmed,
      presencaTotal: t.attendanceTotal ?? 0,
      presencaPresente: t.attendancePresent ?? 0,
      presencaPercent: this.attendancePercent(t),
    };
  }

  renderChart(): void {
    const canvas = this._chartCanvas?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    const sel = this.selected();
    const cards = this.kpiCards();

    const labels = sel
      ? ['Submissões', 'Agendamentos', 'Confirmados', 'Presença (%)']
      : cards.map((c) => c.label);

    const data = sel
      ? [
          sel.submissionCount,
          sel.appointmentTotal,
          sel.appointmentConfirmed,
          this.attendancePercent(sel),
        ]
      : cards.map((c) => c.totalTemplates);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: sel ? sel.name : 'Templates por tipo',
            data,
            backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b'],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    };

    this.chart = new Chart(ctx, config);
  }

  exportDashboard(): void {
    this.messages.info('Função de exportar ainda não implementada.');
  }
}
