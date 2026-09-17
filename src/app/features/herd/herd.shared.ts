import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatusIndicatorComponent } from '../../design-system/data-display/data-display';
import { Animal, animalTone, sexLabels, statusLabels } from './herd.models';

@Component({
  selector: 'app-animal-identity', imports: [RouterLink],
  template: `<div class="identity"><span class="marker" aria-hidden="true"></span><div><a [routerLink]="['/rebanho/animais', animal.id]">{{animal.identification}}</a>@if(animal.name){<small>{{animal.name}}</small>}</div></div>`,
  styles: [`.identity{display:flex;align-items:center;gap:.75rem;min-width:12rem}.marker{width:.55rem;height:2.15rem;border-radius:99px;background:var(--color-primary-subtle);border:1px solid var(--color-accent)}a{font-weight:730;text-decoration:none;letter-spacing:-.01em}a:hover{text-decoration:underline}small{display:block;color:var(--color-text-muted);font-size:.75rem}`], changeDetection: ChangeDetectionStrategy.OnPush,
}) export class AnimalIdentityComponent { @Input({ required: true }) animal!: Animal; }

@Component({
  selector: 'app-animal-state', imports: [StatusIndicatorComponent],
  template: `<gr-status-indicator [tone]="tone">{{label}}</gr-status-indicator>`, changeDetection: ChangeDetectionStrategy.OnPush,
}) export class AnimalStateComponent { @Input({ required: true }) status!: Animal['status']; get tone(){ return animalTone(this.status); } get label(){ return statusLabels[this.status]; } }

export function formatDate(value: string | null | undefined): string { if (!value) return 'Não informada'; return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`)); }
export function sexLabel(value: Animal['sex']): string { return sexLabels[value]; }
export function errorReference(id?: string): string { return id ? id.slice(0, 8).toUpperCase() : ''; }
