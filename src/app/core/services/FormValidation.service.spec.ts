import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FormValidationService } from './FormValidation.service';

describe('FormValidationService', () => {
  let service: FormValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [FormValidationService] });
    service = TestBed.inject(FormValidationService);
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  // ─── createValidators ────────────────────────────────────────────────────────

  describe('createValidators', () => {
    it('deve criar validator required', () => {
      const validators = service.createValidators({ name: { required: true } });
      const control = new FormControl('', validators['name']);
      expect(control.hasError('required')).toBe(true);

      control.setValue('Valor');
      expect(control.hasError('required')).toBe(false);
    });

    it('deve criar validator email', () => {
      const validators = service.createValidators({ email: { email: true } });
      const control = new FormControl('email-invalido', validators['email']);
      expect(control.hasError('email')).toBe(true);

      control.setValue('valido@email.com');
      expect(control.hasError('email')).toBe(false);
    });

    it('deve criar validator minLength', () => {
      const validators = service.createValidators({ senha: { minLength: 6 } });
      const control = new FormControl('abc', validators['senha']);
      expect(control.hasError('minlength')).toBe(true);

      control.setValue('abcdef');
      expect(control.hasError('minlength')).toBe(false);
    });

    it('deve criar validator maxLength', () => {
      const validators = service.createValidators({ campo: { maxLength: 5 } });
      const control = new FormControl('abcdefg', validators['campo']);
      expect(control.hasError('maxlength')).toBe(true);

      control.setValue('abc');
      expect(control.hasError('maxlength')).toBe(false);
    });

    it('deve criar validator pattern', () => {
      const validators = service.createValidators({ cpf: { pattern: /^\d{11}$/ } });
      const control = new FormControl('123', validators['cpf']);
      expect(control.hasError('pattern')).toBe(true);

      control.setValue('12345678901');
      expect(control.hasError('pattern')).toBe(false);
    });

    it('deve criar validator customizado', () => {
      const customFn = (c: FormControl) => c.value === 'proibido' ? { customError: 'Valor proibido' } : null;
      const validators = service.createValidators({ campo: { custom: customFn } });
      const control = new FormControl('proibido', validators['campo']);
      expect(control.hasError('customError')).toBe(true);
    });

    it('deve suportar múltiplos validators no mesmo campo', () => {
      const validators = service.createValidators({
        email: { required: true, email: true },
      });
      const control = new FormControl('', validators['email']);
      expect(control.hasError('required')).toBe(true);

      control.setValue('invalido');
      expect(control.hasError('email')).toBe(true);

      control.setValue('ok@email.com');
      expect(control.valid).toBe(true);
    });

    it('deve retornar array vazio para campo sem regras', () => {
      const validators = service.createValidators({ campo: {} });
      expect(validators['campo']).toHaveLength(0);
    });

    it('deve processar múltiplos campos independentemente', () => {
      const validators = service.createValidators({
        nome: { required: true },
        email: { required: true, email: true },
      });
      expect(validators['nome']).toHaveLength(1);
      expect(validators['email']).toHaveLength(2);
    });
  });

  // ─── getErrorMessage ─────────────────────────────────────────────────────────

  describe('getErrorMessage', () => {
    it('deve retornar string vazia para control null', () => {
      expect(service.getErrorMessage(null)).toBe('');
    });

    it('deve retornar string vazia para control sem erros', () => {
      const control = new FormControl('valor válido', Validators.required);
      expect(service.getErrorMessage(control)).toBe('');
    });

    it('deve retornar mensagem de required com nome do campo', () => {
      const control = new FormControl('', Validators.required);
      expect(service.getErrorMessage(control, 'Nome')).toBe('Nome é obrigatório');
    });

    it('deve usar "Campo" como padrão quando fieldName não é fornecido', () => {
      const control = new FormControl('', Validators.required);
      expect(service.getErrorMessage(control)).toBe('Campo é obrigatório');
    });

    it('deve retornar mensagem de email inválido', () => {
      const control = new FormControl('invalido', Validators.email);
      expect(service.getErrorMessage(control, 'E-mail')).toBe('Email inválido');
    });

    it('deve retornar mensagem de minlength com o tamanho mínimo', () => {
      const control = new FormControl('ab', Validators.minLength(5));
      expect(service.getErrorMessage(control)).toBe('Mínimo de 5 caracteres');
    });

    it('deve retornar mensagem de maxlength com o tamanho máximo', () => {
      const control = new FormControl('abcdefghij', Validators.maxLength(5));
      expect(service.getErrorMessage(control)).toBe('Máximo de 5 caracteres');
    });

    it('deve retornar mensagem de pattern inválido', () => {
      const control = new FormControl('abc', Validators.pattern(/^\d+$/));
      expect(service.getErrorMessage(control)).toBe('Formato inválido');
    });

    it('deve retornar mensagem customizada de erro', () => {
      const control = new FormControl(null);
      control.setErrors({ customError: 'Valor já cadastrado' });
      expect(service.getErrorMessage(control)).toBe('Valor já cadastrado');
    });

    it('deve retornar "Campo inválido" para erro desconhecido', () => {
      const control = new FormControl(null);
      control.setErrors({ unknownError: true });
      expect(service.getErrorMessage(control)).toBe('Campo inválido');
    });
  });
});
