import { Component, Input, Output, EventEmitter, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Subconjunto dos metadados que o Spring Page retorna no JSON */
export interface SpringPage {
  page: number;          // 0-based
  size: number;
  totalElements: number;
  totalPages: number;
}

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss']
})
export class PaginationComponent {
  @Input({ required: true }) pagination!: SpringPage;
  @Output() pageChange = new EventEmitter<number>();

  get hasPrev(): boolean {
    return this.pagination.page > 0;
  }

  get hasNext(): boolean {
    return this.pagination.page < this.pagination.totalPages - 1;
  }

  /** Retorna array de páginas para exibir (janela de ±2 em volta da atual) */
  get pages(): number[] {
    const total = this.pagination.totalPages;
    const current = this.pagination.page;
    const delta = 2;
    const start = Math.max(0, current - delta);
    const end = Math.min(total - 1, current + delta);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  goTo(page: number): void {
    if (page < 0 || page >= this.pagination.totalPages || page === this.pagination.page) return;
    this.pageChange.emit(page);
  }
}
