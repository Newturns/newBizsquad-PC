import {ActivatedRouteSnapshot, CanActivate, CanLoad, Route, Router, RouterStateSnapshot, UrlSegment} from '@angular/router';
import {Injectable} from '@angular/core';
import {BizFireService} from '../biz-fire/biz-fire';
import {ConfigService} from '../config.service';
import {Electron} from '../providers/electron';

@Injectable({
  providedIn: 'root'
})

export class isChatValue implements CanLoad, CanActivate {

  constructor(private bizFire: BizFireService,
              private configService: ConfigService,
              private electronService : Electron,
              private router: Router) {
  }

  private checkChatValue() {
    return new Promise<boolean>( resolve => {
      this.electronService.ipcRenderer.invoke('test-channel','getChatData').then((result) => {
        console.log("get chat Data :::",result);
        if (result.chat) {
          this.router.navigate([`${this.configService.firebaseName}/chat-frame`]);
          resolve(true);
        } else {
          resolve(true);
        }
      });
    })
  }



  canLoad(route: Route, segments: UrlSegment[]): Promise<boolean>  {
    return this.checkChatValue();
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean>{
    return this.checkChatValue();
  }

}
