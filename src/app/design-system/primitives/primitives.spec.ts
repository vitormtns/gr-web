import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { beforeEach, describe, expect, it } from 'vitest';
import { ButtonComponent, InputComponent, SwitchComponent } from './primitives';

@Component({imports:[ReactiveFormsModule,InputComponent,SwitchComponent],template:`<gr-input label="Nome" [formControl]="name"/><gr-switch [formControl]="active">Ativo</gr-switch>`})
class FormHost { name=new FormControl('Santa Clara');active=new FormControl(false); }

describe('primitivos do Design System',()=>{
  it('desabilita o botão, anuncia carregamento e preserva o espaço do rótulo',async()=>{const fixture=TestBed.createComponent(ButtonComponent);fixture.componentRef.setInput('loading',true);fixture.detectChanges();const button=fixture.nativeElement.querySelector('button') as HTMLButtonElement;expect(button.disabled).toBe(true);expect(button.textContent).toContain('Carregando');expect(button.querySelector('.label')?.classList.contains('loading-label')).toBe(true);expect(button.querySelector('.label')?.classList.contains('sr-only')).toBe(false);});
  it('integra campos e switch com Angular Forms',async()=>{const fixture:ComponentFixture<FormHost>=TestBed.configureTestingModule({imports:[FormHost]}).createComponent(FormHost);fixture.detectChanges();const input=fixture.nativeElement.querySelector('input') as HTMLInputElement;expect(input.value).toBe('Santa Clara');const toggle=fixture.nativeElement.querySelector('[role="switch"]') as HTMLButtonElement;toggle.click();fixture.detectChanges();expect(fixture.componentInstance.active.value).toBe(true);expect(toggle.getAttribute('aria-checked')).toBe('true');});
});
