import {
  Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, ChangeDetectorRef, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { EquipmentOption, EquipmentService } from '../../../core/services/equipment.service';
import { MessageService } from '../../../core/services/message.service';

/**
 * Autocomplete paginado para selecionar um equipamento do catalogo.
 * Performance: busca server-side com debounce + scroll infinito.
 * Projeto ZONELESS: chamadas HTTP precisam de cdr.markForCheck() para atualizar a tela.
 */
@Component({
  selector: 'app-equipment-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './equipment-select.component.html',
  styleUrls: ['./equipment-select.component.scss'],
})
export class EquipmentSelectComponent implements OnInit, OnDestroy {
  @Input() catalogId!: number;
  @Input() recordId?: number;
  @Input() columnKey = '';
  @Input() value: string | null = null;
  @Input() onlyAvailable = false;
  @Input() placeholder = 'Selecionar...';
  @Input() pageSize = 20;
  @Input() disabled = false;

  @Output() valueChange = new EventEmitter<string | null>();

  query = '';
  open = false;
  loading = false;
  saving = false;
  options: EquipmentOption[] = [];
  page = 0;
  totalPages = 0;

  private search$ = new Subject<string>();

  constructor(
    private equipmentService: EquipmentService,
    private messages: MessageService,
    private host: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.query = this.value ?? '';
    this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe((q) => {
      this.page = 0;
      this.fetch(q, false);
    });
  }

  ngOnDestroy(): void {
    this.search$.complete();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent): void {
    if (!this.host.nativeElement.contains(ev.target as Node)) {
      this.open = false;
      this.query = this.value ?? '';
      this.cdr.markForCheck();
    }
  }

  onFocus(): void {
    if (this.disabled) return;
    this.open = true;
    this.page = 0;
    this.fetch('', false);
  }

  onInput(value: string): void {
    this.query = value;
    this.open = true;
    this.search$.next(value);
  }

  onScroll(ev: Event): void {
    const el = ev.target as HTMLElement;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
    if (nearBottom && !this.loading && this.page + 1 < this.totalPages) {
      this.page += 1;
      this.fetch(this.query, true);
    }
  }

  private fetch(q: string, append: boolean): void {
    if (!this.catalogId) return;
    this.loading = true;
    this.equipmentService
      .searchOptions(this.catalogId, q, this.onlyAvailable, this.page, this.pageSize)
      .subscribe({
        next: (res) => {
          this.options = append ? [...this.options, ...res.content] : res.content;
          this.totalPages = res.totalPages;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => { this.loading = false; this.cdr.markForCheck(); },
      });
  }

  pick(opt: EquipmentOption): void {
    this.commit(opt.label);
  }

  clear(ev?: Event): void {
    ev?.stopPropagation();
    this.commit(null);
  }

  private commit(label: string | null): void {
    this.open = false;

    if (this.recordId == null) {
      this.value = label;
      this.query = label ?? '';
      this.valueChange.emit(label);
      return;
    }

    this.saving = true;
    this.equipmentService.select(this.recordId, this.catalogId, this.columnKey, label).subscribe({
      next: (sel) => {
        this.value = sel.label;
        this.query = sel.label ?? '';
        this.valueChange.emit(sel.label);
        this.saving = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Nao foi possivel selecionar (pode estar esgotado).';
        this.messages.error(msg);
        this.query = this.value ?? '';
        this.saving = false;
        this.cdr.markForCheck();
      },
    });
  }
}
