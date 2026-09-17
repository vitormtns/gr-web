import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AppError } from '../../core/api/api.models';
import { AlertComponent } from '../../design-system/feedback/feedback';
import { HerdApi } from './herd-api.service';
import { AnimalSex, newUuid } from './herd.models';

@Component({
  selector:'app-animal-create-page',providers:[HerdApi],imports:[FormsModule,RouterLink,AlertComponent],
  template:`<div class="herd-page page-enter"><header class="page-header"><div><a class="back-link" routerLink="/rebanho/animais">← Voltar ao rebanho</a><span class="eyebrow">NOVA IDENTIDADE</span><h1>Cadastrar animal</h1><p>Registre a identidade essencial. O histórico começa no momento da criação.</p></div></header>
    <form class="focused-form section-frame" (ngSubmit)="submit()" #form="ngForm"><div class="form-intro"><span class="identity-seal" aria-hidden="true"><i></i></span><div><h2>Identificação do animal</h2><p>Use a identificação reconhecida no manejo da fazenda.</p></div></div>
      <div class="form-grid"><label class="wide"><span>Identificação <b>*</b></span><input name="identification" [(ngModel)]="identification" required maxlength="100" autocomplete="off" placeholder="Ex.: BR-0248" /></label><label><span>Nome</span><input name="name" [(ngModel)]="name" maxlength="255" autocomplete="off" placeholder="Opcional" /></label><label><span>Sexo <b>*</b></span><select name="sex" [(ngModel)]="sex" required><option value="">Selecione</option><option value="FEMALE">Fêmea</option><option value="MALE">Macho</option></select></label><label><span>Data de nascimento</span><input name="birthDate" [(ngModel)]="birthDate" type="date" [max]="today" /></label></div>
      @if(error()){<gr-alert tone="error" title="Não foi possível cadastrar"><p>{{errorText()}}</p>@if(error()?.requestId){<p>Referência: {{error()?.requestId?.slice(0,8)?.toUpperCase()}}</p>}</gr-alert>}
      <footer><a class="quiet-button" routerLink="/rebanho/animais">Cancelar</a><button class="primary-action" type="submit" [disabled]="form.invalid||pending()">{{pending()?'Cadastrando...':'Cadastrar animal'}}</button></footer>
    </form></div>`,changeDetection:ChangeDetectionStrategy.OnPush,
})
export class AnimalCreatePageComponent {
  private readonly api=inject(HerdApi);private readonly router=inject(Router);readonly pending=signal(false);readonly error=signal<AppError|null>(null);readonly today=new Date().toISOString().slice(0,10);readonly operationId=newUuid();identification='';name='';sex:AnimalSex|''='';birthDate='';private saved=false;
  dirty(){return !!(this.identification||this.name||this.sex||this.birthDate)&&!this.saved;}
  canDeactivate(){return !this.dirty()||confirm('Descartar as informações deste animal?');}
  @HostListener('window:beforeunload',['$event']) beforeUnload(event:BeforeUnloadEvent){if(this.dirty())event.preventDefault();}
  submit(){if(!this.identification.trim()||!this.sex||this.pending())return;this.pending.set(true);this.error.set(null);this.api.create({id:this.operationId,identification:this.identification.trim(),name:this.name.trim()||null,sex:this.sex,birthDate:this.birthDate||null}).subscribe({next:animal=>{this.saved=true;void this.router.navigate(['/rebanho/animais',animal.id],{state:{created:true}});},error:error=>{this.pending.set(false);this.error.set(error instanceof AppError?error:null);}});}
  errorText(){const e=this.error();if(e?.code==='HERD_IDENTIFICATION_CONFLICT')return 'Esta identificação já está em uso nesta fazenda.';if(e?.code==='HERD_IDEMPOTENCY_CONFLICT')return 'Este cadastro já foi processado com informações diferentes.';return e?.message||'Revise as informações e tente novamente.';}
}
