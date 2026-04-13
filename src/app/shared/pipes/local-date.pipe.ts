import { Pipe, PipeTransform } from '@angular/core';
import { formatDate } from '@angular/common';

/**
 * Pipe que interpreta strings de data como UTC e exibe no fuso local do usuário.
 * Necessário porque o backend retorna timestamps UTC sem o sufixo 'Z' (LocalDateTime Java),
 * o que faz o Angular tratar como horário local em vez de converter de UTC.
 */
@Pipe({ name: 'localDate', standalone: true })
export class LocalDatePipe implements PipeTransform {
  transform(value: string | null | undefined, format: string): string | null {
    if (!value) return null;
    // Adiciona 'Z' se a string não tiver indicador de timezone
    const normalized = /[Zz]|[+\-]\d{2}:\d{2}$/.test(value) ? value : value + 'Z';
    try {
      return formatDate(normalized, format, 'en-US');
    } catch {
      return value;
    }
  }
}
