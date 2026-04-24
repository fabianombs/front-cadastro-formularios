import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormValidationService } from '../../../core/services/FormValidation.service';
import { MaskDirective } from '../../directives/mask.directive';

/** Tipos de campo que recebem máscara automática */
const MASKED_TYPES = ['phone', 'cpf', 'cnpj', 'date'] as const;
type MaskedType = (typeof MASKED_TYPES)[number];

@Component({
  selector: 'app-form-field',
  templateUrl: './form-field.component.html',
  imports: [ReactiveFormsModule, CommonModule, MaskDirective],
  styleUrls: ['./form-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormFieldComponent {
  @Input() control!: FormControl;
  @Input() label!: string;
  @Input() id!: string;
  @Input() placeholder = '';
  @Input() type: string = 'text';
  @Input() required = false;

  /** Opções para campos do tipo select */
  @Input() options: string[] = [];
  /** Estilos inline aplicados ao <input> — usado para aparência dinâmica de formulários */
  @Input() inputStyle: Record<string, string> = {};
  /** Estilos inline aplicados ao <label> — usado para cor de texto personalizada */
  @Input() labelStyle: Record<string, string> = {};

  // Para mensagens globais do formulário
  @Input() formGroup?: FormGroup;
  @Input() formErrorKey?: string;

  validator = inject(FormValidationService);

  /** Tipo HTML real do <input> — phone/cpf/cnpj/phone-intl renderizam como "text" */
  get htmlInputType(): string {
    if (['phone', 'cpf', 'cnpj', 'phone-intl', 'date'].includes(this.type)) return 'text';
    return this.type;
  }

  /** inputmode específico para mobile — campos de data/telefone/cpf/cnpj abrem teclado numérico */
  get inputMode(): string | null {
    if (['phone', 'cpf', 'cnpj', 'date'].includes(this.type)) return 'numeric';
    return null;
  }

  /** Tipo de máscara a ser passado para a MaskDirective (null = sem máscara) */
  get maskType(): MaskedType | null {
    if ((MASKED_TYPES as readonly string[]).includes(this.type)) {
      return this.type as MaskedType;
    }
    return null;
  }
}