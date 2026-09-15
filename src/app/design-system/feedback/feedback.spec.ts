import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LucideCircleAlert, LucideCircleCheck, LucideInfo, LucideTriangleAlert, provideLucideIcons } from '@lucide/angular';
import { describe, expect, it } from 'vitest';
import { AlertComponent } from './feedback';

@Component({
  imports: [AlertComponent],
  template: `<gr-alert tone="success" title="Alteração concluída"><p>Atualizado.</p></gr-alert>
    <gr-alert tone="warning" title="Atenção necessária"><p>Revise.</p></gr-alert>
    <gr-alert tone="error" title="Não foi possível salvar"><p>Tente novamente.</p></gr-alert>
    <gr-alert tone="info" title="Informação disponível"><p>Consulte.</p></gr-alert>`,
})
class AlertHostComponent {}

describe('AlertComponent', () => {
  it('diferencia os quatro tons e mantém título e mensagem', () => {
    TestBed.configureTestingModule({ providers: [provideLucideIcons(LucideCircleCheck, LucideTriangleAlert, LucideCircleAlert, LucideInfo)] });
    const fixture = TestBed.createComponent(AlertHostComponent);
    fixture.detectChanges();
    const alerts = [...fixture.nativeElement.querySelectorAll('gr-alert .alert')] as HTMLElement[];
    expect(alerts).toHaveLength(4);
    for (const [index, tone] of ['success', 'warning', 'error', 'info'].entries()) {
      expect(alerts[index].classList.contains(tone)).toBe(true);
      expect(alerts[index].querySelector('strong')?.textContent?.trim()).not.toBe('');
      expect(alerts[index].querySelector('p')?.textContent?.trim()).not.toBe('');
    }
  });
});
