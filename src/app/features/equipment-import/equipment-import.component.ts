import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EquipmentCatalog, EquipmentService, ImportEquipmentRequest } from '../../core/services/equipment.service';
import { ExportService } from '../../core/services/export.service';
import { MessageService } from '../../core/services/message.service';

/**
 * Card de import da 2a planilha (equipamentos), exibido na tela do admin.
 *
 * Dois modos:
 *  - EDICAO (templateId presente): importa o catalogo na hora (POST).
 *  - CRIACAO (sem templateId): guarda a config como "pendente" e emite via
 *    pendingChange; o componente pai importa logo apos salvar o formulario.
 *
 * catalogsChanged avisa o pai para recarregar as colunas de select da lista.
 * Projeto ZONELESS: toda atualizacao via Promise/HTTP precisa de cdr.markForCheck().
 */
@Component({
  selector: 'app-equipment-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './equipment-import.component.html',
  styleUrls: ['./equipment-import.component.scss'],
})
export class EquipmentImportComponent implements OnInit {
  @Input() templateId?: number;
  @Output() pendingChange = new EventEmitter<ImportEquipmentRequest | null>();
  @Output() catalogsChanged = new EventEmitter<void>();

  private equipmentService = inject(EquipmentService);
  private exportService = inject(ExportService);
  private messages = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  catalogs: EquipmentCatalog[] = [];
  pending: ImportEquipmentRequest | null = null;

  fileName = '';
  rows: Record<string, string>[] = [];
  columns: string[] = [];
  selectedColumn = '';
  columnName = '';
  stockControl = false;
  visible = true;
  previewCount = 0;
  parsing = false;
  importing = false;

  ngOnInit(): void {
    if (this.templateId) this.loadCatalogs();
  }

  loadCatalogs(): void {
    if (!this.templateId) return;
    this.equipmentService.listCatalogs(this.templateId).subscribe({
      next: (list) => { this.catalogs = list; this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.parsing = true;
    this.fileName = file.name;

    this.exportService.readExcelFile(file)
      .then((rows) => {
        this.rows = rows;
        const keys = new Set<string>();
        rows.forEach((r) => Object.keys(r).forEach((k) => keys.add(k)));
        this.columns = Array.from(keys);
        this.selectedColumn = '';
        this.previewCount = 0;
        this.parsing = false;
        this.cdr.markForCheck();
      })
      .catch(() => {
        this.messages.warning('Arquivo invalido. Use .xlsx ou .xls');
        this.resetImport();
        this.cdr.markForCheck();
      });
    input.value = '';
  }

  onColumnChange(): void {
    this.previewCount = this.selectedColumn
      ? this.equipmentService.aggregateColumn(this.rows, this.selectedColumn).length
      : 0;
    if (this.selectedColumn && !this.columnName) this.columnName = this.selectedColumn;
  }

  private buildRequest(): ImportEquipmentRequest | null {
    if (!this.selectedColumn) {
      this.messages.warning('Escolha a coluna que tem os modelos.');
      return null;
    }
    const options = this.equipmentService.aggregateColumn(this.rows, this.selectedColumn);
    if (options.length === 0) {
      this.messages.warning('A coluna escolhida nao tem valores.');
      return null;
    }
    return {
      name: (this.columnName || this.selectedColumn).trim(),
      columnKey: null,
      sourceColumn: this.selectedColumn,
      stockControl: this.stockControl,
      visible: this.visible,
      options,
    };
  }

  doImport(): void {
    const req = this.buildRequest();
    if (!req) return;

    if (this.templateId) {
      this.importing = true;
      this.equipmentService.importCatalog(this.templateId, req).subscribe({
        next: () => {
          this.messages.success('Catalogo importado com sucesso!');
          this.resetImport();
          this.loadCatalogs();
          this.catalogsChanged.emit();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.messages.error(err?.error?.message || 'Falha ao importar o catalogo.');
          this.importing = false;
          this.cdr.markForCheck();
        },
      });
      return;
    }

    this.pending = req;
    this.pendingChange.emit(req);
    this.messages.success('Equipamentos prontos — serao adicionados ao salvar o formulario.');
    this.resetImport();
    this.cdr.markForCheck();
  }

  removePending(): void {
    this.pending = null;
    this.pendingChange.emit(null);
  }

  resetImport(): void {
    this.fileName = '';
    this.rows = [];
    this.columns = [];
    this.selectedColumn = '';
    this.columnName = '';
    this.stockControl = false;
    this.visible = true;
    this.previewCount = 0;
    this.parsing = false;
    this.importing = false;
  }

  toggleStock(cat: EquipmentCatalog): void {
    this.equipmentService.setStockControl(cat.id, !cat.stockControl).subscribe({
      next: (updated) => { Object.assign(cat, updated); this.catalogsChanged.emit(); this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  toggleVisible(cat: EquipmentCatalog): void {
    this.equipmentService.setVisible(cat.id, !cat.visible).subscribe({
      next: (updated) => { Object.assign(cat, updated); this.catalogsChanged.emit(); this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  removeCatalog(cat: EquipmentCatalog): void {
    this.equipmentService.deleteCatalog(cat.id).subscribe({
      next: () => {
        this.catalogs = this.catalogs.filter((c) => c.id !== cat.id);
        this.catalogsChanged.emit();
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }
}
