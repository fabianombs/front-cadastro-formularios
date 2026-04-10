import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormValidationService } from '../../../core/services/FormValidation.service';

@Component({
  selector: 'app-form-field',
  templateUrl: './form-field.component.html',
  imports: [ReactiveFormsModule, CommonModule],
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
}