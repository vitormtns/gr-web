import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';
import { ContextStore } from '../../core/context/context.store';
import { AlertComponent } from '../../design-system/feedback/feedback';
import { ButtonComponent, InputComponent } from '../../design-system/primitives/primitives';

@Component({
  selector:'app-login-page',
  imports:[ReactiveFormsModule,InputComponent,ButtonComponent,AlertComponent],
  template:`<main>
    <section class="territory" aria-hidden="true">
      <div class="brand"><span class="brand-mark"><i></i></span><strong>Gerenciador Rural</strong></div>
      <div class="coordinates">19°55′S · 43°56′W</div>
      <div class="contours contour-a"></div><div class="contours contour-b"></div><div class="route-line"></div><span class="point point-a"></span><span class="point point-b"></span>
      <div class="territory-copy"><span>Território vivo</span><h2>Clareza para cada decisão no campo.</h2><p>Organizações, fazendas e operações conectadas em um só lugar.</p></div>
    </section>
    <section class="access">
      <div class="form-wrap">
        <div class="mobile-brand"><span class="brand-mark"><i></i></span><strong>Gerenciador Rural</strong></div>
        <div class="heading"><span>Acesso seguro</span><h1>Entre no portal</h1><p>Use as credenciais vinculadas à sua organização.</p></div>
        @if(notice()){<gr-alert tone="warning" title="Atenção"><p>{{notice()}}</p></gr-alert>}
        @if(error()){<gr-alert tone="error" title="Não foi possível entrar"><p>{{error()}}</p></gr-alert>}
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <gr-input label="E-mail" type="email" placeholder="nome@fazenda.com.br" [required]="true" [error]="emailError()" formControlName="email" />
          <gr-input label="Senha" type="password" placeholder="Digite sua senha" [required]="true" [error]="passwordError()" formControlName="password" />
          <gr-button type="submit" [loading]="loading()">Entrar</gr-button>
        </form>
        <p class="support">Problemas para acessar? Fale com o administrador da sua organização.</p>
      </div>
      <footer>Ambiente protegido · Supabase Auth</footer>
    </section>
  </main>`,
  styles:[`
    main{min-height:100dvh;display:grid;grid-template-columns:minmax(26rem,1.05fr) minmax(28rem,.95fr);background:var(--color-surface)}
    .territory{position:relative;overflow:hidden;min-height:100%;padding:var(--space-8);color:#edf5ef;background:#173e2d}
    .territory:after{content:'';position:absolute;inset:0;background-image:linear-gradient(rgb(255 255 255 / 4%) 1px,transparent 1px),linear-gradient(90deg,rgb(255 255 255 / 4%) 1px,transparent 1px);background-size:4rem 4rem;mask-image:linear-gradient(to bottom,transparent,black 35%,black 70%,transparent)}
    .brand,.mobile-brand{position:relative;z-index:3;display:flex;align-items:center;gap:var(--space-3)}.brand strong,.mobile-brand strong{letter-spacing:-.02em}
    .brand-mark{width:2rem;height:2rem;display:grid;place-items:center;border:1px solid rgb(255 255 255 / 20%);border-radius:var(--radius-sm);background:rgb(255 255 255 / 8%)}.brand-mark i{width:1rem;height:.75rem;border:1.5px solid currentColor;border-radius:60% 40% 55% 45%;transform:rotate(-12deg)}
    .coordinates{position:absolute;z-index:3;top:var(--space-8);right:var(--space-8);font-size:.625rem;letter-spacing:.12em;color:#9ab6a4}
    .contours{position:absolute;z-index:1;border:1px solid rgb(178 209 187 / 18%);border-radius:48% 52% 38% 62% / 58% 42% 58% 42%}.contour-a{width:32rem;height:24rem;right:-5rem;top:17%}.contour-b{width:25rem;height:19rem;right:-1rem;top:22%;transform:rotate(7deg);box-shadow:0 0 0 3rem rgb(178 209 187 / 3%),0 0 0 6rem rgb(178 209 187 / 2%)}
    .route-line{position:absolute;z-index:2;width:44rem;height:16rem;left:-11rem;top:35%;border-top:1px dashed rgb(196 223 203 / 38%);border-radius:50%;transform:rotate(-12deg)}
    .point{position:absolute;z-index:3;width:.625rem;height:.625rem;border:2px solid #173e2d;border-radius:50%;background:#b9d2bf;box-shadow:0 0 0 1px #b9d2bf}.point-a{left:22%;top:42%}.point-b{right:22%;top:33%}
    .territory-copy{position:absolute;z-index:3;left:var(--space-8);right:var(--space-8);bottom:var(--space-12);max-width:34rem}.territory-copy>span,.heading>span{display:block;margin-bottom:var(--space-3);font-size:.6875rem;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:#9fc0a8}.territory-copy h2{max-width:30rem;margin-bottom:var(--space-4);font-size:clamp(2.2rem,4.2vw,4rem);line-height:1.02;letter-spacing:-.055em}.territory-copy p{max-width:28rem;margin:0;color:#b9ccbf;font-size:1rem}
    .access{display:grid;grid-template-rows:1fr auto;padding:var(--space-8);background:var(--color-surface)}.form-wrap{width:min(100%,24rem);margin:auto}.mobile-brand{display:none;color:var(--color-primary)}.mobile-brand .brand-mark{border-color:var(--color-border);background:var(--color-primary-subtle)}
    .heading{margin-bottom:var(--space-8)}.heading>span{color:var(--color-primary)}.heading h1{margin-bottom:var(--space-2);font-size:1.75rem;letter-spacing:-.04em}.heading p{margin:0}
    form{display:grid;gap:var(--space-5);margin-top:var(--space-5)}form gr-button{width:100%}form gr-button::ng-deep button{width:100%}
    .support{margin:var(--space-6) 0 0;text-align:center;font-size:.75rem;color:var(--color-text-muted)}footer{text-align:center;font-size:.6875rem;color:var(--color-text-muted)}
    @media(max-width:52rem){main{grid-template-columns:1fr}.territory{display:none}.access{min-height:100dvh;padding:var(--space-6)}.mobile-brand{display:flex;margin-bottom:var(--space-16)}footer{margin-top:var(--space-8)}}
  `],
  changeDetection:ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  readonly loading=signal(false);readonly error=signal('');
  readonly form=new FormGroup({email:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.email]}),password:new FormControl('',{nonNullable:true,validators:[Validators.required]})});
  readonly notice=signal('');
  constructor(private readonly auth:AuthStore,private readonly context:ContextStore,private readonly router:Router,private readonly route:ActivatedRoute){const reason=route.snapshot.queryParamMap.get('motivo');this.notice.set(reason==='sessao-expirada'?'Sua sessão expirou. Entre novamente.':reason==='contexto-indisponivel'?'Não foi possível validar seu contexto de acesso. Entre novamente.':'');}
  emailError():string{return this.form.controls.email.touched&&this.form.controls.email.invalid?(this.form.controls.email.hasError('email')?'Informe um e-mail válido.':'E-mail é obrigatório.'):'';}
  passwordError():string{return this.form.controls.password.touched&&this.form.controls.password.invalid?'Senha é obrigatória.':'';}
  async submit():Promise<void>{
    if(this.form.invalid){this.form.markAllAsTouched();return;}
    this.loading.set(true);this.error.set('');
    try{await this.auth.signIn(this.form.controls.email.value,this.form.controls.password.value);this.context.clear();await this.context.initialize();const returnUrl=this.route.snapshot.queryParamMap.get('retorno');await this.router.navigateByUrl(returnUrl?.startsWith('/')&&!returnUrl.startsWith('//')?returnUrl:'/');}
    catch(error){if(this.auth.isAuthenticated()){await this.router.navigate(['/']);}else{this.error.set(error instanceof Error?error.message:'Não foi possível entrar agora. Tente novamente.');}}
    finally{this.loading.set(false);}
  }
}
