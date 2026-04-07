import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-modal.component.html',
  styleUrls: ['./confirm-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmModalComponent {
  /** Controla visibilidade */
  @Input() open = false;

  /** Título do modal */
  @Input() title = 'Confirmar ação';

  /** Mensagem de confirmação */
  @Input() message = 'Tem certeza que deseja continuar?';

  /** Texto do botão de confirmar (padrão: Excluir) */
  @Input() confirmLabel = 'Excluir';

  /** Variante do botão de confirmar: 'danger' | 'primary' */
  @Input() confirmVariant: 'danger' | 'primary' = 'danger';

  /** Estado de carregamento durante a ação */
  @Input() loading = false;

  /** Emite quando o usuário confirma */
  @Output() confirmed = new EventEmitter<void>();

  /** Emite quando o usuário cancela ou fecha */
  @Output() cancelled = new EventEmitter<void>();

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    if (!this.loading) {
      this.cancelled.emit();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('cm-backdrop')) {
      this.onCancel();
    }
  }
}
