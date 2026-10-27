import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CepService, ResultadoCep } from './cep.service';

// Simula o authInterceptor da aplicação: toda requisição que passar por ele
// leva o token. A consulta de CEP NÃO pode passar.
const interceptorQueAnexaToken: HttpInterceptorFn = (req, next) =>
  next(req.clone({ setHeaders: { Authorization: 'Bearer token-do-admin' } }));

describe('CepService', () => {
  let service: CepService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([interceptorQueAnexaToken])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(CepService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('somenteDigitos deve remover máscara e tolerar nulo', () => {
    expect(CepService.somenteDigitos('01001-000')).toBe('01001000');
    expect(CepService.somenteDigitos(null)).toBe('');
  });

  it('deve consultar o ViaCEP e mapear o endereço', () => {
    let resultado: ResultadoCep | undefined;
    service.buscar('01001-000').subscribe((r) => (resultado = r));

    const req = httpMock.expectOne('https://viacep.com.br/ws/01001000/json/');
    expect(req.request.method).toBe('GET');
    req.flush({ cep: '01001-000', logradouro: 'Praça da Sé', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP' });

    expect(resultado).toEqual({
      status: 'encontrado',
      endereco: { cep: '01001-000', logradouro: 'Praça da Sé', bairro: 'Sé', cidade: 'São Paulo', uf: 'SP' },
    });
  });

  it('NÃO deve enviar o token de login para o ViaCEP (ignora interceptors)', () => {
    service.buscar('01001000').subscribe();
    const req = httpMock.expectOne('https://viacep.com.br/ws/01001000/json/');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ cep: '01001-000' });
  });

  it('deve retornar nao-encontrado quando o ViaCEP responde { erro: true }', () => {
    let resultado: ResultadoCep | undefined;
    service.buscar('99999999').subscribe((r) => (resultado = r));
    httpMock.expectOne('https://viacep.com.br/ws/99999999/json/').flush({ erro: true });
    expect(resultado).toEqual({ status: 'nao-encontrado' });
  });

  it('deve retornar nao-encontrado sem chamar a rede para CEP incompleto', () => {
    let resultado: ResultadoCep | undefined;
    service.buscar('0100').subscribe((r) => (resultado = r));
    httpMock.expectNone(() => true);
    expect(resultado).toEqual({ status: 'nao-encontrado' });
  });

  it('deve retornar erro (sem lançar) quando o serviço está fora', () => {
    let resultado: ResultadoCep | undefined;
    service.buscar('01001000').subscribe((r) => (resultado = r));
    httpMock
      .expectOne('https://viacep.com.br/ws/01001000/json/')
      .flush('fora', { status: 503, statusText: 'Service Unavailable' });
    expect(resultado).toEqual({ status: 'erro' });
  });
});
