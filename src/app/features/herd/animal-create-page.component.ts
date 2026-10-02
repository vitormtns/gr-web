import { ChangeDetectionStrategy, Component, HostListener, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AppError } from '../../core/api/api.models';
import { localDateOnly } from '../../core/date/date-only';
import { AlertComponent } from '../../design-system/feedback/feedback';
import { DialogComponent } from '../../design-system/surfaces/surfaces';
import { HerdApi } from './herd-api.service';
import { AnimalSex, newUuid } from './herd.models';

@Component({
  selector:'app-animal-create-page',providers:[HerdApi],imports:[FormsModule,RouterLink,AlertComponent,DialogComponent],
  template:`<div class="herd-page page-enter"><header class="page-header"><div><a class="back-link" routerLink="/rebanho/animais">← Voltar ao rebanho</a><span class="eyebrow">NOVA IDENTIDADE</span><h1>Cadastrar animal</h1><p>Registre a identidade essencial. O histórico começa no momento da criação.</p></div></header>
    <form class="focused-form section-frame" (ngSubmit)="submit()" #form="ngForm"><div class="form-intro"><span class="identity-seal" aria-hidden="true"><i></i></span><div><h2>Identificação do animal</h2><p>Use a identificação reconhecida no manejo da fazenda.</p></div></div>
      <div class="form-grid"><label class="wide"><span>Identificação <b>*</b></span><input #identificationInput name="identification" [(ngModel)]="identification" required maxlength="100" autocomplete="off" placeholder="Ex.: BR-0248" /></label><label><span>Nome</span><input name="name" [(ngModel)]="name" maxlength="255" autocomplete="off" placeholder="Opcional" /></label><label><span>Sexo <b>*</b></span><select name="sex" [(ngModel)]="sex" required><option value="">Selecione</option><option value="FEMALE">Fêmea</option><option value="MALE">Macho</option></select></label><label><span>Data de nascimento</span><input name="birthDate" [(ngModel)]="birthDate" type="date" [max]="today" /></label></div>
      @if(error()){<gr-alert tone="error" title="Não foi possível cadastrar"><p>{{errorText()}}</p>@if(error()?.requestId){<p>Referência: {{error()?.requestId?.slice(0,8)?.toUpperCase()}}</p>}</gr-alert>}
      @if(createdMessage()){<p role="status">Animal {{createdMessage()}} cadastrado. Preencha os dados do próximo animal.</p>}
      <footer><button class="secondary-action" type="button" [disabled]="form.invalid||pending()" (click)="submit(true)">Salvar e adicionar outro</button><a class="quiet-button" routerLink="/rebanho/animais">Cancelar</a><button class="primary-action" type="submit" [disabled]="form.invalid||pending()">{{pending()?'Cadastrando...':'Cadastrar animal'}}</button></footer>
    </form><gr-dialog [open]="discardOpen()" (closed)="decideDiscard(false)"><h2 dialog-title>Descartar cadastro?</h2><p>As informações preenchidas para este animal serão perdidas.</p><div dialog-actions><button class="quiet-button" type="button" (click)="decideDiscard(false)">Continuar cadastro</button><button class="primary-action" type="button" (click)="decideDiscard(true)">Descartar informações</button></div></gr-dialog></div>`,changeDetection:ChangeDetectionStrategy.OnPush,
})
export class AnimalCreatePageComponent {
  private readonly api=inject(HerdApi);private readonly router=inject(Router);readonly pending=signal(false);readonly error=signal<AppError|null>(null);readonly discardOpen=signal(false);readonly today=localDateOnly();operationId=newUuid();readonly createdMessage=signal('');readonly identificationInput=viewChild<ElementRef<HTMLInputElement>>('identificationInput');identification='';name='';sex:AnimalSex|''='';birthDate='';private saved=false;private resolveDiscard:((discard:boolean)=>void)|null=null;
  dirty(){return !!(this.identification||this.name||this.sex||this.birthDate)&&!this.saved;}
  canDeactivate():boolean|Promise<boolean>{if(!this.dirty())return true;if(this.resolveDiscard)return false;this.discardOpen.set(true);return new Promise<boolean>(resolve=>{this.resolveDiscard=resolve;});}
  decideDiscard(discard:boolean){this.discardOpen.set(false);const resolve=this.resolveDiscard;this.resolveDiscard=null;resolve?.(discard);}
  @HostListener('window:beforeunload',['$event']) beforeUnload(event:BeforeUnloadEvent){if(this.dirty())event.preventDefault();}
  submit(addAnother=false){if(!this.identification.trim()||!this.sex||this.pending())return;this.pending.set(true);this.error.set(null);this.createdMessage.set('');this.api.create({id:this.operationId,identification:this.identification.trim(),name:this.name.trim()||null,sex:this.sex,birthDate:this.birthDate||null}).subscribe({next:animal=>{if(addAnother){this.createdMessage.set(animal.identification);this.operationId=newUuid();this.identification=this.name=this.birthDate='';this.sex='';this.saved=false;this.pending.set(false);queueMicrotask(()=>this.identificationInput()?.nativeElement.focus());return;}this.saved=true;void this.router.navigate(['/rebanho/animais',animal.id],{state:{created:true}});},error:error=>{this.pending.set(false);this.error.set(error instanceof AppError?error:null);}});}
  errorText(){const e=this.error();if(e?.code==='HERD_IDENTIFICATION_CONFLICT')return 'Esta identificação já está em uso nesta fazenda.';if(e?.code==='HERD_IDEMPOTENCY_CONFLICT')return 'Este cadastro já foi processado com informações diferentes.';return e?.message||'Revise as informações e tente novamente.';}
}
