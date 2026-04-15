import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validator para CPF brasileiro.
 * Aceita o valor com ou sem máscara (ex: "333.444.555-66" ou "33344455566").
 * Campo vazio é ignorado — deixe o `Validators.required` cuidar disso.
 */
export function cpfValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const digits = (control.value ?? '').replace(/\D/g, '');
    if (!digits) return null;
    return isValidCpf(digits) ? null : { cpfInvalido: true };
  };
}

/**
 * Validator para CNPJ brasileiro.
 * Aceita o valor com ou sem máscara (ex: "33.444.555/0001-66" ou "33444555000166").
 * Campo vazio é ignorado — deixe o `Validators.required` cuidar disso.
 */
export function cnpjValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const digits = (control.value ?? '').replace(/\D/g, '');
    if (!digits) return null;
    return isValidCnpj(digits) ? null : { cnpjInvalido: true };
  };
}

// ── Algoritmos de validação ───────────────────────────────────────────────────

function isValidCpf(cpf: string): boolean {
  if (cpf.length !== 11) return false;
  // Rejeita sequências repetidas (ex: 000.000.000-00)
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  return remainder === Number(cpf[10]);
}

function isValidCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14) return false;
  // Rejeita sequências repetidas (ex: 00.000.000/0000-00)
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const calcDigit = (digits: string, weights: number[]): number => {
    const sum = weights.reduce((acc, w, i) => acc + Number(digits[i]) * w, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const d1 = calcDigit(cnpj, weights1);
  if (d1 !== Number(cnpj[12])) return false;

  const d2 = calcDigit(cnpj, weights2);
  return d2 === Number(cnpj[13]);
}
