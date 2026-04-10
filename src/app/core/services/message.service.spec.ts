import { TestBed } from '@angular/core/testing';
import { MessageService } from './message.service';
import { ToastrService } from 'ngx-toastr';

describe('MessageService', () => {
  let service: MessageService;
  let toastrSpy: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    warning: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    toastrSpy = {
      success: vi.fn().mockReturnValue({}),
      error: vi.fn().mockReturnValue({}),
      info: vi.fn().mockReturnValue({}),
      warning: vi.fn().mockReturnValue({}),
    };

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        { provide: ToastrService, useValue: toastrSpy },
      ],
    });

    service = TestBed.inject(MessageService);
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  // ─── success ────────────────────────────────────────────────────────────────

  it('success deve chamar toastr.success com a mensagem correta', () => {
    service.success('Operação realizada!');
    expect(toastrSpy.success).toHaveBeenCalledWith(
      'Operação realizada!',
      undefined,
      expect.objectContaining({ timeOut: 5000, closeButton: true, progressBar: true }),
    );
  });

  it('success deve aceitar título e configuração customizada', () => {
    service.success('Salvo!', 'Sucesso', { timeOut: 3000 });
    expect(toastrSpy.success).toHaveBeenCalledWith(
      'Salvo!',
      'Sucesso',
      expect.objectContaining({ timeOut: 3000 }),
    );
  });

  // ─── error ──────────────────────────────────────────────────────────────────

  it('error deve chamar toastr.error com a mensagem correta', () => {
    service.error('Algo deu errado');
    expect(toastrSpy.error).toHaveBeenCalledWith(
      'Algo deu errado',
      undefined,
      expect.objectContaining({ timeOut: 5000 }),
    );
  });

  it('error deve aceitar título', () => {
    service.error('Falha na operação', 'Erro');
    expect(toastrSpy.error).toHaveBeenCalledWith('Falha na operação', 'Erro', expect.any(Object));
  });

  // ─── info ───────────────────────────────────────────────────────────────────

  it('info deve chamar toastr.info', () => {
    service.info('Informação importante');
    expect(toastrSpy.info).toHaveBeenCalledWith(
      'Informação importante',
      undefined,
      expect.objectContaining({ progressBar: true }),
    );
  });

  // ─── warning ────────────────────────────────────────────────────────────────

  it('warning deve chamar toastr.warning', () => {
    service.warning('Atenção!', 'Aviso');
    expect(toastrSpy.warning).toHaveBeenCalledWith('Atenção!', 'Aviso', expect.any(Object));
  });

  // ─── Config padrão ──────────────────────────────────────────────────────────

  it('deve mesclar config padrão com config personalizada (personalizada prevalece)', () => {
    service.success('Msg', undefined, { timeOut: 1000, positionClass: 'toast-bottom-left' });
    const callArgs = toastrSpy.success.mock.calls[0][2];
    expect(callArgs.timeOut).toBe(1000);
    expect(callArgs.positionClass).toBe('toast-bottom-left');
    expect(callArgs.closeButton).toBe(true); // do padrão
  });
});
