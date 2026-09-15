import { ErrorHandler, Injectable } from '@angular/core';
import { ToastService } from '../../design-system/feedback/feedback';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private readonly toasts: ToastService) {}

  handleError(): void {
    this.toasts.show('error', 'Ocorreu um erro inesperado', 'Atualize a página. Se o problema continuar, fale com o suporte.');
  }
}
