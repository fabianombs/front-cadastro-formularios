import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { PaginationComponent, SpringPage } from './pagination.component';

describe('PaginationComponent', () => {
  let component: PaginationComponent;
  let fixture: ComponentFixture<PaginationComponent>;

  const defaultPagination: SpringPage = { page: 2, size: 10, totalElements: 50, totalPages: 5 };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
    component.pagination = defaultPagination;
    fixture.detectChanges();
  });

  it('deve ser criado', () => {
    expect(component).toBeTruthy();
  });

  // ─── hasPrev / hasNext ───────────────────────────────────────────────────

  it('hasPrev deve ser true quando não está na primeira página', () => {
    component.pagination = { ...defaultPagination, page: 2 };
    expect(component.hasPrev).toBe(true);
  });

  it('hasPrev deve ser false na primeira página', () => {
    component.pagination = { ...defaultPagination, page: 0 };
    expect(component.hasPrev).toBe(false);
  });

  it('hasNext deve ser true quando não está na última página', () => {
    component.pagination = { ...defaultPagination, page: 2, totalPages: 5 };
    expect(component.hasNext).toBe(true);
  });

  it('hasNext deve ser false na última página', () => {
    component.pagination = { ...defaultPagination, page: 4, totalPages: 5 };
    expect(component.hasNext).toBe(false);
  });

  // ─── pages ──────────────────────────────────────────────────────────────

  it('pages deve retornar janela de ±2 ao redor da página atual', () => {
    component.pagination = { ...defaultPagination, page: 2, totalPages: 5 };
    expect(component.pages).toEqual([0, 1, 2, 3, 4]);
  });

  it('pages deve limitar ao início quando página atual é 0', () => {
    component.pagination = { ...defaultPagination, page: 0, totalPages: 10 };
    expect(component.pages).toEqual([0, 1, 2]);
  });

  it('pages deve limitar ao fim quando página atual está no final', () => {
    component.pagination = { ...defaultPagination, page: 9, totalPages: 10 };
    expect(component.pages).toEqual([7, 8, 9]);
  });

  it('pages deve retornar apenas [0] quando há uma única página', () => {
    component.pagination = { ...defaultPagination, page: 0, totalPages: 1 };
    expect(component.pages).toEqual([0]);
  });

  // ─── goTo ────────────────────────────────────────────────────────────────

  it('goTo deve emitir pageChange com o número da página', () => {
    const emitSpy = vi.spyOn(component.pageChange, 'emit');
    component.goTo(1);
    expect(emitSpy).toHaveBeenCalledWith(1);
  });

  it('goTo não deve emitir se a página é a atual', () => {
    const emitSpy = vi.spyOn(component.pageChange, 'emit');
    component.goTo(2); // página atual é 2
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('goTo não deve emitir para página negativa', () => {
    const emitSpy = vi.spyOn(component.pageChange, 'emit');
    component.goTo(-1);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('goTo não deve emitir para página além do total', () => {
    const emitSpy = vi.spyOn(component.pageChange, 'emit');
    component.goTo(5); // totalPages é 5, índice máximo é 4
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('goTo deve emitir para a primeira página (0)', () => {
    const emitSpy = vi.spyOn(component.pageChange, 'emit');
    component.goTo(0); // página atual é 2, então 0 é válido
    expect(emitSpy).toHaveBeenCalledWith(0);
  });

  it('goTo deve emitir para a última página válida', () => {
    const emitSpy = vi.spyOn(component.pageChange, 'emit');
    component.goTo(4);
    expect(emitSpy).toHaveBeenCalledWith(4);
  });
});
