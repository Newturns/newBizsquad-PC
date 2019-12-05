import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeGuard } from './home-guard';
import {LangService} from './lang.service';
import {HttpClientModule} from '@angular/common/http';
import {BizFireModule} from '../biz-fire/biz-fire.module';
import {Electron} from '../providers/electron';
import {NotificationService} from './notification.service';
import {UserStatusProvider} from './user-status';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    HttpClientModule,
    BizFireModule.forRoot()
  ],
  providers:[
    HomeGuard,
    LangService,
    Electron,
    NotificationService,
    UserStatusProvider
  ]
})
export class CoreModule { }
