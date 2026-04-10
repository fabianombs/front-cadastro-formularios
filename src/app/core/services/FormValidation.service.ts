import { Injectable } from '@angular/core';
import { FormGroup, ValidatorFn, Validators, AbstractControl } from '@angular/forms';

/**
 * Serviço utilitário para criação dinâmica de validators e geração de mensagens
 * de erro amigáveis para campos de formulários reativos.
 *
 * Centraliza a lógica de validação para evitar duplicação entre componentes.
 *
 * Uso — criando validators a partir de regras:
 * ```ts
 * const validators = this.formValidation.createValidators({
 *   email: { required: true, email: true },
 *   name:  { required: true, minLength: 3 }
 * });
 * ```
 *
 * Uso — obtendo mensagem de erro:
 * ```ts
 * this.formValidation.getErrorMessage(form.get('email'), 'E-mail')
 * // → 'E-mail é obrigatório'
 * ```
 */
@Injectable({ providedIn: 'root' })
export class FormValidationService {

  /**
   * Cria um mapa de `ValidatorFn[]` a partir de um objeto de regras de validação.
   *
   * Regras suportadas por campo:
   * - `required: true` → Validators.required
   * - `email: true` → Validators.email
   * - `minLength: number` → Validators.minLength(n)
   * - `maxLength: number` → Validators.maxLength(n)
   * - `pattern: string | RegExp` → Validators.pattern(p)
   * - `custom: ValidatorFn` → ValidatorFn personalizado
   *
   * @param rules - Objeto cujas chaves são nomes de campos e valores são objetos de regras
   * @returns Mapa `{ [fieldName]: ValidatorFn[] }` pronto para uso no `FormBuilder`
   */
  createValidators(rules: Record<string, Record<string, unknown>>): Record<string, ValidatorFn[]> {
    const result: Record<string, ValidatorFn[]> = {};

    for (const key in rules) {
      const fieldRules = rules[key];
      const validators: ValidatorFn[] = [];

      if (fieldRules['required']) validators.push(Validators.required);
      if (fieldRules['email']) validators.push(Validators.email);
      if (fieldRules['minLength']) validators.push(Validators.minLength(fieldRules['minLength'] as number));
      if (fieldRules['maxLength']) validators.push(Validators.maxLength(fieldRules['maxLength'] as number));
      if (fieldRules['pattern']) validators.push(Validators.pattern(fieldRules['pattern'] as string | RegExp));
      if (fieldRules['custom']) validators.push(fieldRules['custom'] as ValidatorFn);

      result[key] = validators;
    }

    return result;
  }

  /**
   * Retorna a primeira mensagem de erro amigável de um `AbstractControl`.
   *
   * Ordem de verificação: required → email → minlength → maxlength → pattern → customError.
   *
   * @param control - O controle do formulário (pode ser `null`)
   * @param fieldName - Nome do campo exibido na mensagem (ex: `'E-mail'`, `'Senha'`)
   * @returns Mensagem de erro em português, ou string vazia se não houver erros
   */
  getErrorMessage(control: AbstractControl | null, fieldName?: string): string {
    if (!control || !control.errors) return '';

    if (control.errors['required']) return `${fieldName || 'Campo'} é obrigatório`;
    if (control.errors['email']) return 'Email inválido';
    if (control.errors['minlength']) return `Mínimo de ${control.errors['minlength'].requiredLength} caracteres`;
    if (control.errors['maxlength']) return `Máximo de ${control.errors['maxlength'].requiredLength} caracteres`;
    if (control.errors['pattern']) return 'Formato inválido';
    if (control.errors['customError']) return control.errors['customError'] as string;

    return 'Campo inválido';
  }
}
