import { Injectable } from '@angular/core';
import { ToastrService, IndividualConfig, ActiveToast } from 'ngx-toastr';

/**
 * Configuração padrão aplicada a todas as notificações toast.
 * Pode ser sobrescrita por configuração individual em cada chamada.
 */
const DEFAULT_CONFIG: Partial<IndividualConfig> = {
  timeOut: 5000,
  positionClass: 'toast-top-right',
  closeButton: true,
  progressBar: true,
};

/**
 * Serviço centralizado para exibição de notificações toast na interface.
 *
 * Abstrai o `ToastrService` do ngx-toastr, aplicando uma configuração padrão
 * consistente e expondo métodos semânticos por tipo de mensagem.
 *
 * Uso:
 * ```ts
 * this.messages.success('Operação realizada com sucesso!');
 * this.messages.error('Falha ao salvar', 'Erro');
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class MessageService {
  constructor(private toastr: ToastrService) {}

  /**
   * Exibe uma notificação de sucesso (verde).
   *
   * @param message - Corpo da mensagem
   * @param title - Título opcional do toast
   * @param config - Configurações adicionais para sobrescrever o padrão
   */
  success(message: string, title?: string, config: Partial<IndividualConfig> = {}): ActiveToast<unknown> {
    return this.toastr.success(message, title, { ...DEFAULT_CONFIG, ...config });
  }

  /**
   * Exibe uma notificação de erro (vermelho).
   *
   * @param message - Corpo da mensagem
   * @param title - Título opcional do toast
   * @param config - Configurações adicionais para sobrescrever o padrão
   */
  error(message: string, title?: string, config: Partial<IndividualConfig> = {}): ActiveToast<unknown> {
    return this.toastr.error(message, title, { ...DEFAULT_CONFIG, ...config });
  }

  /**
   * Exibe uma notificação informativa (azul).
   *
   * @param message - Corpo da mensagem
   * @param title - Título opcional do toast
   * @param config - Configurações adicionais para sobrescrever o padrão
   */
  info(message: string, title?: string, config: Partial<IndividualConfig> = {}): ActiveToast<unknown> {
    return this.toastr.info(message, title, { ...DEFAULT_CONFIG, ...config });
  }

  /**
   * Exibe uma notificação de aviso (amarelo/laranja).
   *
   * @param message - Corpo da mensagem
   * @param title - Título opcional do toast
   * @param config - Configurações adicionais para sobrescrever o padrão
   */
  warning(message: string, title?: string, config: Partial<IndividualConfig> = {}): ActiveToast<unknown> {
    return this.toastr.warning(message, title, { ...DEFAULT_CONFIG, ...config });
  }
}
