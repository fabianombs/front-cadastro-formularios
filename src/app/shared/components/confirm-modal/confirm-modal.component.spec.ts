import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { ConfirmModalComponent } from './confirm-modal.component';

describe('ConfirmModalComponent', () => {
  let component: ConfirmModalComponent;
  let fixture: ComponentFixture<ConfirmModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve ser criado', () => {
    expect(component).toBeTruthy();
  });

  // ─── Valores padrão ─────────────────────────────────────────────────────

  it('deve ter valores padrão corretos', () => {
    expect(component.open).toBe(false);
    expect(component.title).toBe('Confirmar ação');
    expect(component.message).toBe('Tem certeza que deseja continuar?');
    expect(component.confirmLabel).toBe('Excluir');
    expect(component.confirmVariant).toBe('danger');
    expect(component.loading).toBe(false);
  });

  // ─── onConfirm ──────────────────────────────────────────────────────────

  it('onConfirm deve emitir o evento confirmed', () => {
    const emitSpy = vi.spyOn(component.confirmed, 'emit');
    component.onConfirm();
    expect(emitSpy).toHaveBeenCalled();
  });

  // ─── onCancel ───────────────────────────────────────────────────────────

  it('onCancel deve emitir o evento cancelled quando não está carregando', () => {
    component.loading = false;
    const emitSpy = vi.spyOn(component.cancelled, 'emit');
    component.onCancel();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('onCancel não deve emitir quando está carregando', () => {
    component.loading = true;
    const emitSpy = vi.spyOn(component.cancelled, 'emit');
    component.onCancel();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  // ─── onBackdropClick ────────────────────────────────────────────────────

  it('onBackdropClick deve chamar onCancel quando target tem classe cm-backdrop', () => {
    const cancelSpy = vi.spyOn(component, 'onCancel');
    const target = document.createElement('div');
    target.classList.add('cm-backdrop');
    const event = { target } as unknown as MouseEvent;
    component.onBackdropClick(event);
    expect(cancelSpy).toHaveBeenCalled();
  });

  it('onBackdropClick não deve chamar onCancel quando target não tem classe cm-backdrop', () => {
    const cancelSpy = vi.spyOn(component, 'onCancel');
    const target = document.createElement('button');
    const event = { target } as unknown as MouseEvent;
    component.onBackdropClick(event);
    expect(cancelSpy).not.toHaveBeenCalled();
  });

  // ─── Inputs customizados ─────────────────────────────────────────────────

  it('deve aceitar confirmVariant "primary"', () => {
    component.confirmVariant = 'primary';
    fixture.detectChanges();
    expect(component.confirmVariant).toBe('primary');
  });

  it('deve aceitar título e mensagem customizados', () => {
    component.title = 'Excluir Cliente';
    component.message = 'Deseja remover este cliente?';
    fixture.detectChanges();
    expect(component.title).toBe('Excluir Cliente');
    expect(component.message).toBe('Deseja remover este cliente?');
  });
});
