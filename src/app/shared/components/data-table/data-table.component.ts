import { Component, Input, Output, EventEmitter, TemplateRef, ContentChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DataTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  class?: string;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent<T = any> {
  @Input({ required: true }) columns: DataTableColumn[] = [];
  @Input({ required: true }) rows: T[] = [];
  @Input() sortColumn: string | null = null;
  @Input() sortDirection: 'asc' | 'desc' = 'asc';
  @Input() noDataLabel = 'Nenhum registro encontrado';
  @Input() rowKey = 'id';
  @Input() rowClass?: (row: T) => string | string[] | Record<string, boolean>;
  @Output() sortChange = new EventEmitter<string>();
  @Output() rowClick = new EventEmitter<T>();

  @ContentChild('rowTemplate', { read: TemplateRef }) rowTemplate?: TemplateRef<any>;

  onSort(column: DataTableColumn): void {
    if (!column.sortable) return;
    this.sortChange.emit(column.key);
  }

  getIcon(column: DataTableColumn): string {
    if (!column.sortable) return '';
    if (!this.sortColumn || this.sortColumn !== column.key) return '↕';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  onRowClick(row: T): void {
    this.rowClick.emit(row);
  }

  trackByFn(index: number, item: T): any {
    return (item as any)?.[this.rowKey] ?? index;
  }
}
