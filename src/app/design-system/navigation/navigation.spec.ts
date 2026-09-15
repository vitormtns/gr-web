import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { TabsComponent } from './navigation';

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
