import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateChild,
  CanLoad,
  Route,
  Router,
  RouterStateSnapshot,
  UrlSegment
} from '@angular/router';

import {take} from 'rxjs/operators';
import {BizFireService} from '../biz-fire/biz-fire';
import {IBizGroup, IUserData} from '../_models';
import {ChatService} from '../providers/chat.service';


@Injectable({
  providedIn: 'root'
})
export class GidLoadService implements CanActivate, CanLoad, CanActivateChild {

  constructor(private bizFire: BizFireService,
              private chatService : ChatService,
              private router: Router) { }

  canLoad(route: Route, segments: UrlSegment[]): Promise<boolean>  {
    return this.loadLastPcGid();
  }

  private loadLastPcGid(): Promise<boolean>{
    
    return new Promise<boolean>( resolve => {
      // wait for load user data.
      this.bizFire.currentUser
        .pipe(take(1))
        .subscribe((userData: IUserData) => {
          
          // if data exist, load one.
          if(userData && userData.lastPcGid != null){
            
            // do nothing if already loaded.
            if(this.bizFire.currentBizGroup && this.bizFire.currentBizGroup.gid === userData.lastPcGid){
              resolve(true);
              return;
            }
            console.log('lastPcGid', userData.lastPcGid, 'load...');
            this.bizFire.loadBizGroup(userData.lastPcGid).then( g => {
              resolve(true);
            }).catch(()=>{
              // lastMobileGid's gid not found form db.

              this.router.navigate([`${this.bizFire.configService.firebaseName}/selector`]);
              resolve(true);
            });

          } else {
            // nothing to load.
            // go back to selector
            console.error('lastPcGid not found. Select first group.', userData);
            console.log("firebaseName ::",this.bizFire.configService.firebaseName);

            this.router.navigate([`${this.bizFire.configService.firebaseName}/selector`]);
            resolve(true);
          }
        });
    });
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean >  {
    return this.loadLastPcGid();
  }
  
  canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    return this.loadLastPcGid();
  }
  
  
  


}
