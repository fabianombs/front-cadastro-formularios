import { Injectable } from '@angular/core';
import { FormGroup, ValidatorFn, Validators, AbstractControl } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class FormValidationService {
  
  constructor() {}

  /**
   * Cria validators do Angular a partir de regras genéricas
   */
  createValidators(rules: Record<string, any>): Record<string, ValidatorFn[]> {
    const result: Record<string, ValidatorFn[]> = {};

    for (const key in rules) {
      const fieldRules = rules[key];
      const validators: ValidatorFn[] = [];

      if (fieldRules.required) validators.push(Validators.required);
      if (fieldRules.email) validators.push(Validators.email);
      if (fieldRules.minLength) validators.push(Validators.minLength(fieldRules.minLength));
      if (fieldRules.maxLength) validators.push(Validators.maxLength(fieldRules.maxLength));
      if (fieldRules.pattern) validators.push(Validators.pattern(fieldRules.pattern));
      if (fieldRules.custom) validators.push(fieldRules.custom as ValidatorFn);

      result[key] = validators;
    }

    return result;
  }

  /**
   * Retorna a mensagem de erro amigável de um FormControl
   */
  getErrorMessage(control: AbstractControl | null, fieldName?: string): string {
    if (!control || !control.errors) return '';

    if (control.errors['required']) return `${fieldName || 'Campo'} é obrigatório`;
    if (control.errors['email']) return 'Email inválido';
    if (control.errors['minlength']) return `Mínimo de ${control.errors['minlength'].requiredLength} caracteres`;
    if (control.errors['maxlength']) return `Máximo de ${control.errors['maxlength'].requiredLength} caracteres`;
    if (control.errors['pattern']) return 'Formato inválido';
    if (control.errors['customError']) return control.errors['customError'];

    return 'Campo inválido';
  }
}