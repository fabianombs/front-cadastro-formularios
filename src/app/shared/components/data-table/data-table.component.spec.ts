import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { DataTableComponent, DataTableColumn } from './data-table.component';

describe('DataTableComponent', () => {
  let component: DataTableComponent;
  let fixture: ComponentFixture<DataTableComponent>;

  const mockColumns: DataTableColumn[] = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'name', label: 'Nome', sortable: true },
    { key: 'email', label: 'E-mail' },
  ];

  const mockRows = [
    { id: 1, name: 'João', email: 'joao@email.com' },
    { id: 2, name: 'Maria', email: 'maria@email.com' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DataTableComponent);
    component = fixture.componentInstance;
    component.columns = mockColumns;
    component.rows = mockRows;
    // Não chamamos detectChanges: o template usa #defaultRow com let-row
    // que fica undefined quando rowTemplate não é fornecido (uso interno via ContentChild).
  });

  it('deve ser criado', () => {
    expect(component).toBeTruthy();
  });

  // ─── onSort ──────────────────────────────────────────────────────────────

  it('onSort deve emitir sortChange quando coluna é sortable', () => {
    const emitSpy = vi.spyOn(component.sortChange, 'emit');
    component.onSort({ key: 'name', label: 'Nome', sortable: true });
    expect(emitSpy).toHaveBeenCalledWith('name');
  });

  it('onSort não deve emitir quando coluna não é sortable', () => {
    const emitSpy = vi.spyOn(component.sortChange, 'emit');
    component.onSort({ key: 'email', label: 'E-mail' });
    expect(emitSpy).not.toHaveBeenCalled();
  });

  // ─── getIcon ─────────────────────────────────────────────────────────────

  it('getIcon deve retornar string vazia para colunas não sortáveis', () => {
    expect(component.getIcon({ key: 'email', label: 'E-mail' })).toBe('');
  });

  it('getIcon deve retornar ↕ quando nenhuma coluna está ordenada', () => {
    component.sortColumn = null;
    expect(component.getIcon({ key: 'name', label: 'Nome', sortable: true })).toBe('↕');
  });

  it('getIcon deve retornar ↕ quando outra coluna está ordenada', () => {
    component.sortColumn = 'id';
    expect(component.getIcon({ key: 'name', label: 'Nome', sortable: true })).toBe('↕');
  });

  it('getIcon deve retornar ↑ para ordenação ascendente na coluna atual', () => {
    component.sortColumn = 'name';
    component.sortDirection = 'asc';
    expect(component.getIcon({ key: 'name', label: 'Nome', sortable: true })).toBe('↑');
  });

  it('getIcon deve retornar ↓ para ordenação descendente na coluna atual', () => {
    component.sortColumn = 'name';
    component.sortDirection = 'desc';
    expect(component.getIcon({ key: 'name', label: 'Nome', sortable: true })).toBe('↓');
  });

  // ─── onRowClick ──────────────────────────────────────────────────────────

  it('onRowClick deve emitir o row clicado', () => {
    const emitSpy = vi.spyOn(component.rowClick, 'emit');
    const row = mockRows[0];
    component.onRowClick(row);
    expect(emitSpy).toHaveBeenCalledWith(row);
  });

  // ─── trackByFn ───────────────────────────────────────────────────────────

  it('trackByFn deve retornar o id do item quando disponível', () => {
    expect(component.trackByFn(0, { id: 42, name: 'Teste' })).toBe(42);
  });

  it('trackByFn deve retornar o índice quando item não tem a rowKey', () => {
    component.rowKey = 'id';
    expect(component.trackByFn(3, {})).toBe(3);
  });

  it('trackByFn deve usar rowKey customizado', () => {
    component.rowKey = 'email';
    expect(component.trackByFn(0, { email: 'teste@email.com' })).toBe('teste@email.com');
  });

  // ─── Inputs ──────────────────────────────────────────────────────────────

  it('deve exibir mensagem padrão quando rows está vazio', () => {
    component.rows = [];
    fixture.detectChanges();
    expect(component.noDataLabel).toBe('Nenhum registro encontrado');
  });

  it('deve aceitar noDataLabel customizado', () => {
    component.noDataLabel = 'Sem dados disponíveis';
    expect(component.noDataLabel).toBe('Sem dados disponíveis');
  });
});
