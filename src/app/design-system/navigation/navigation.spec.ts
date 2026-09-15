import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { ContextNavigatorComponent, TabsComponent } from './navigation';

describe('TabsComponent', () => {
  it('permite trocar de aba com as setas e mantém foco na opção ativa', () => {
    const fixture = TestBed.createComponent(TabsComponent);
    fixture.componentRef.setInput('tabs', [
      { id: 'geral', label: 'Geral' },
      { id: 'acesso', label: 'Acesso' },
    ]);
    fixture.componentRef.setInput('active', 'geral');
    fixture.detectChanges();
    const selected = vi.fn();
    fixture.componentInstance.activeChange.subscribe(selected);
    const tabs = fixture.nativeElement.querySelectorAll('[role="tab"]') as NodeListOf<HTMLButtonElement>;
    tabs[0].focus();
    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(selected).toHaveBeenCalledWith('acesso');
    expect(document.activeElement).toBe(tabs[1]);
  });
});

describe('ContextNavigatorComponent', () => {
  function setup() {
    const fixture = TestBed.createComponent(ContextNavigatorComponent);
    fixture.componentRef.setInput('organizations', [
      { organizationId: 'org-1', organizationName: 'Grupo Santa Clara', membershipId: 'm-1', role: 'OWNER', farmScopeMode: 'ALL' },
      { organizationId: 'org-2', organizationName: 'Grupo Horizonte', membershipId: 'm-2', role: 'MANAGER', farmScopeMode: 'ALL' },
    ]);
    fixture.componentRef.setInput('farms', [
      { farmId: 'farm-1', farmName: 'Fazenda Santa Clara' },
      { farmId: 'farm-2', farmName: 'Fazenda Boa Vista' },
    ]);
    fixture.componentRef.setInput('organization', { organizationId: 'org-1', organizationName: 'Grupo Santa Clara', membershipId: 'm-1', role: 'OWNER', farmScopeMode: 'ALL' });
    fixture.componentRef.setInput('farm', { farmId: 'farm-1', farmName: 'Fazenda Santa Clara' });
    fixture.detectChanges();
    return fixture;
  }

  it('apresenta organização e fazenda como uma unidade e emite a fazenda escolhida', () => {
    const fixture = setup();
    const trigger = fixture.nativeElement.querySelector('.trigger') as HTMLButtonElement;
    expect(trigger.textContent).toContain('Grupo Santa Clara');
    expect(trigger.textContent).toContain('Fazenda Santa Clara');
    const changed = vi.fn();
    fixture.componentInstance.farmChanged.subscribe(changed);
    trigger.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')?.id).toBe(trigger.getAttribute('aria-controls'));
    const option = [...fixture.nativeElement.querySelectorAll('.options button')].find((button: HTMLButtonElement) => button.textContent?.includes('Fazenda Boa Vista')) as HTMLButtonElement;
    option.click();
    fixture.detectChanges();
    expect(changed).toHaveBeenCalledWith('farm-2');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('permite trocar organização e fecha com Escape, devolvendo o foco', () => {
    const fixture = setup();
    const trigger = fixture.nativeElement.querySelector('.trigger') as HTMLButtonElement;
    const changed = vi.fn();
    fixture.componentInstance.organizationChanged.subscribe(changed);
    trigger.click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.change-organization') as HTMLButtonElement).click();
    fixture.detectChanges();
    const option = [...fixture.nativeElement.querySelectorAll('.organization-options button')].find((button: HTMLButtonElement) => button.textContent?.includes('Grupo Horizonte')) as HTMLButtonElement;
    option.click();
    expect(changed).toHaveBeenCalledWith('org-2');
    trigger.click();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });
});
