import { Injectable } from '@angular/core';
import { ToastrService, IndividualConfig, ActiveToast } from 'ngx-toastr';

const DEFAULT_CONFIG: Partial<IndividualConfig> = {
  timeOut: 5000,
  positionClass: 'toast-top-right',
  closeButton: true,
  progressBar: true,
};

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  constructor(private toastr: ToastrService) {}

  success(message: string, title?: string, config: Partial<IndividualConfig> = {}): ActiveToast<unknown> {
    return this.toastr.success(message, title, { ...DEFAULT_CONFIG, ...config });
  }

  error(message: string, title?: string, config: Partial<IndividualConfig> = {}): ActiveToast<unknown> {
    return this.toastr.error(message, title, { ...DEFAULT_CONFIG, ...config });
  }

  info(message: string, title?: string, config: Partial<IndividualConfig> = {}): ActiveToast<unknown> {
    return this.toastr.info(message, title, { ...DEFAULT_CONFIG, ...config });
  }

  warning(message: string, title?: string, config: Partial<IndividualConfig> = {}): ActiveToast<unknown> {
    return this.toastr.warning(message, title, { ...DEFAULT_CONFIG, ...config });
  }
}
