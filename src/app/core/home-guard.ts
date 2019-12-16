import { Injectable } from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, CanLoad, Route, Router, RouterStateSnapshot, UrlSegment} from '@angular/router';
import {ConfigService} from '../config.service';
import {BizFireService} from '../biz-fire/biz-fire';
import {Electron} from '../providers/electron';


@Injectable({
    providedIn: 'root'
})

export class HomeGuard implements CanLoad, CanActivate {

    constructor(private bizFire: BizFireService,
                private configService: ConfigService,
                private electronService : Electron,
                private router: Router) {

    }

    private checkLogin(){
        return new Promise<boolean>( resolve => {

            if(this.configService.firebaseName == null){
                console.error('HomeGuard:, ConfigService.firebaseName is null.');
                console.error('redirect to /login');
                this.router.navigate(['/login']);
                resolve(false);
                return;
            }
        
            const authSub = this.bizFire.authState
            //.pipe(take(1)) // delete mean watch all the time
              .subscribe(user => {
                  if(user == null){
                      authSub.unsubscribe();
                      console.error('HomeGuard login check failed. User not signed in.');
                      console.error('redirect to /login');
                      this.router.navigate(['/login']);
                      resolve(false);
                  } else {
                      resolve(true);
                  }
              });
        });
    }
    
    canLoad(route: Route, segments: UrlSegment[]): Promise<boolean>  {
        return this.checkLogin();
    }
    
    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean>{
        return new Promise<boolean>( resolve => {
            this.electronService.ipcRenderer.invoke('test-channel','getChatData').then((result) => {
                console.log("getChatData:",result);
                if(result.chat) {
                    this.router.navigate(['/chat-frame']);
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
        // return this.checkLogin();
    }
    
}
