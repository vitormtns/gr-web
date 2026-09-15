import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig).catch(() => {
  const message = document.createElement('main');
  message.setAttribute('role', 'alert');
  message.textContent = 'Não foi possível iniciar o portal. Atualize a página e tente novamente.';
  document.body.replaceChildren(message);
});
