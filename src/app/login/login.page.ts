import {Component, NgZone, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ValidatorFn, Validators} from '@angular/forms';
import {LoadingProvider} from '../providers/loading';
import {ConfigService} from '../config.service';
import {BizFireService} from '../biz-fire/biz-fire';
import {Router} from '@angular/router';
import {Electron} from '../providers/electron';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {

  //앱 버전.
  version : any;

  loginForm: FormGroup;

  autoLoign : boolean = false;

  private companyValidator: ValidatorFn = Validators.compose([
    Validators.required,
  ]);
  private emailValidator: ValidatorFn = Validators.compose([
    Validators.required,
    Validators.email
  ]);
  private passwordValidator: ValidatorFn = Validators.compose([
    Validators.required,
    Validators.minLength(6)
  ]);

  constructor(
      private formBuilder: FormBuilder,
      private loading: LoadingProvider,
      private configService: ConfigService,
      private bizFire : BizFireService,
      private router : Router,
      private electronService : Electron,
      private ngZone : NgZone
  ) {

    this.loginForm = formBuilder.group({
      company: ['',this.companyValidator],
      email: ['', this.emailValidator],
      password: ['', this.passwordValidator]
    });

  }

  ngOnInit() {

    console.log("login page ngOninit");

    // 버전 가져오기
    this.version = this.electronService.remote.app.getVersion();

    this.electronService.ipcRenderer.send('getLocalUser', 'ping');

    this.electronService.ipcRenderer.once('sendUserData',async (e, data) => {
      this.loginForm.get('email').setValue(data.id);
      this.autoLoign = data.auto;
      this.loginForm.get('company').setValue(data.company);

      //오토로그인 체크되어있을때 비밀번호 값 넣기
      if(this.autoLoign && this.bizFire.firstLogin.getValue()) {
        this.loginForm.get('password').setValue(data.pwd);

        //자동로그인시 아이오닉 UI에러 해결 ngZone.
        this.ngZone.run(() => {
          this.onLogin();
        });
      }
    });
  }

  async onLogin() {

    if(this.loginForm.valid) {
      try {
        const loading = await this.loading.show();

        const company = this.loginForm.value['company'];
        const email = this.loginForm.value['email'];
        const password = this.loginForm.value['password'];

        let companyCheckOk = false;
        companyCheckOk = await this.configService.checkCompanyName(company);

        const user = await this.bizFire.loginWithEmail(email, password);
        console.log(`[${this.configService.firebaseName}] ${user.email}[${user.uid}] logged in.`);

        this.electronService.saveLocalUser(email,password,this.autoLoign,company,user.uid);

        // go to main/tabs
        await this.router.navigate([`/${this.configService.firebaseName}`]);

        await loading.dismiss();
      } catch (e) {
        if(e.code === 'companyNotFound') {
          this.loginForm.get('company').setValue('');
          this.electronService.showErrorMessages("company not found",e.message);
        } else {
          this.electronService.showErrorMessages("Login failed.",e.message);
        }
      }
    }
  }


  onAutoLogin() {
    this.autoLoign = !this.autoLoign;
  }

  goLink(url) {
    this.electronService.goLink(url);
  }

  windowMimimize(){
    this.electronService.windowMimimize();
  }

  windowHide() {
    this.electronService.windowHide();
  }

}
