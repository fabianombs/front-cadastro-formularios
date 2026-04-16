import { Directive, ElementRef, HostListener, Input, OnChanges, Optional, Self } from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * Diretiva de máscara para campos de formulário.
 *
 * Tipos suportados:
 * - `phone`  → (11) 90000-0000 ou (11) 2222-2222 (auto-detecta pelo número de dígitos)
 * - `cpf`    → 333.444.555-66
 * - `cnpj`   → 33.444.555/0001-66
 */
@Directive({
  selector: '[appMask]',
  standalone: true,
})
export class MaskDirective implements OnChanges {
  @Input('appMask') maskType: 'phone' | 'cpf' | 'cnpj' | null | undefined;

  constructor(
    private el: ElementRef<HTMLInputElement>,
    @Optional() @Self() private ngControl: NgControl,
  ) {}

  ngOnChanges(): void {
    // Ao mudar o tipo de máscara, re-aplica na valor atual
    const current = this.el.nativeElement.value;
    if (current) {
      this.applyMask(current);
    }
  }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    if (!this.maskType) return;
    const input = event.target as HTMLInputElement;
    this.applyMask(input.value);
  }

  @HostListener('blur')
  onBlur(): void {
    if (!this.maskType) return;
    this.applyMask(this.el.nativeElement.value);
  }

  private applyMask(rawValue: string): void {
    const digits = rawValue.replace(/\D/g, '');
    let formatted = '';

    switch (this.maskType) {
      case 'phone':
        formatted = this.applyPhoneMask(digits);
        break;
      case 'cpf':
        formatted = this.applyCpfMask(digits);
        break;
      case 'cnpj':
        formatted = this.applyCnpjMask(digits);
        break;
      default:
        return;
    }

    this.el.nativeElement.value = formatted;
    if (this.ngControl?.control) {
      this.ngControl.control.setValue(formatted, { emitEvent: false });
    }
  }

  /**
   * Detecta automaticamente fixo ou celular pelo número de dígitos:
   * - até 10 dígitos (DDD + 8) → (XX) XXXX-XXXX  (fixo)
   * - 11 dígitos (DDD + 9)     → (XX) XXXXX-XXXX (celular)
   */
  private applyPhoneMask(digits: string): string {
    const d = digits.slice(0, 11);
    if (d.length === 0) return '';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) {
      // Fixo: (XX) XXXX-XXXX
      return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    }
    // Celular: (XX) XXXXX-XXXX
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  /** XXX.XXX.XXX-XX */
  private applyCpfMask(digits: string): string {
    const d = digits.slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }

  /** XX.XXX.XXX/XXXX-XX */
  private applyCnpjMask(digits: string): string {
    const d = digits.slice(0, 14);
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
    if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
    if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
}
