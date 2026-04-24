import { AbstractControl, ValidatorFn, ValidationErrors } from '@angular/forms';

/** Valida string no formato dd/mm/aaaa, verificando dia/mês/ano reais. */
export function dateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value as string) ?? '';
    if (!value) return null;

    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
    if (!match) return { dataInvalida: true };

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    if (month < 1 || month > 12) return { dataInvalida: true };
    if (day < 1 || day > 31) return { dataInvalida: true };
    if (year < 1900 || year > 2100) return { dataInvalida: true };

    const d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
      return { dataInvalida: true };
    }

    return null;
  };
}

/** Converte "dd/mm/aaaa" para "yyyy-mm-dd" (ISO). Retorna a string original se inválida. */
export function dateBrToIso(value: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value ?? '');
  if (!match) return value;
  return `${match[3]}-${match[2]}-${match[1]}`;
}
