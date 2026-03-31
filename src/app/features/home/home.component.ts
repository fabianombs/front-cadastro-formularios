import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService, DashboardSummary } from '../../core/services/dashboard.service';
import { ExportService } from '../../core/services/export.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  private dashboardService = inject(DashboardService);
  private exportService = inject(ExportService);

  summary = signal<DashboardSummary | null>(null);
  loading = signal(true);

  attendanceRate = computed(() => {
    const s = this.summary();
    if (!s || s.totalAttendanceRecords === 0) return 0;
    return Math.round((s.presentAttendanceRecords / s.totalAttendanceRecords) * 100);
  });

  confirmRate = computed(() => {
    const s = this.summary();
    if (!s || s.totalAppointments === 0) return 0;
    return Math.round((s.confirmedAppointments / s.totalAppointments) * 100);
  });

  ngOnInit() {
    this.dashboardService.getSummary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  exportDashboard() {
    const s = this.summary();
    if (!s) return;
    this.exportService.exportDashboard(s);
  }

  attendancePercent(t: { attendanceTotal: number; attendancePresent: number }): number {
    if (!t.attendanceTotal) return 0;
    return Math.round((t.attendancePresent / t.attendanceTotal) * 100);
  }
}
