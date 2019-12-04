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


@Injectable({
  providedIn: 'root'
})
export class GidLoadService implements CanActivate, CanLoad, CanActivateChild {

  constructor(private bizFire: BizFireService,
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
              
              // set select first bizgroup
              this.bizFire.getAllGroups().then( (groups: IBizGroup[]) => {
                
                if(groups.length === 0){
                  // 속한 그룹이 하나도 없다.
                  // 일단 more 페이지로 보낸다.
                  this.router.navigate([`${this.bizFire.configService.firebaseName}/selector`]);
                  resolve(true);
                  return;
                } else {
                  // set select first bizgroup 첫번째 그룹을 임의로 선택해 준다.
                  this.bizFire.loadBizGroup(groups[0].gid)
                    .then((g: any) => {
                      resolve(true);
                    });
                }
                
              });
            });

          } else {
            // nothing to load.
            // go back to selector
            console.error('lastMobileGid not found. Select first group.', userData);
            // set select first bizgroup
            this.bizFire.getAllGroups().then( (groups: IBizGroup[]) => {
              if(groups.length === 0){
                // 속한 그룹이 하나도 없다.
                // 일단 more 페이지로 보낸다.
                this.router.navigate([`${this.bizFire.configService.firebaseName}/selector`]);
                resolve(true);
              } else {
                // set select first bizgroup 첫번째 그룹을 임의로 선택해 준다.
                this.bizFire.loadBizGroup(groups[0].gid)
                  .then((g: any) => {
                    resolve(true);
                  });
              }
            });
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
