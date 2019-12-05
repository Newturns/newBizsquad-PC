import { Component, OnInit } from '@angular/core';
import {TakeUntil} from '../biz-common/take-until';
import {IBizGroup} from '../_models';
import {BizFireService} from '../biz-fire/biz-fire';
import {Router} from '@angular/router';
import {Electron} from '../providers/electron';
import {BizGroupBuilder} from '../biz-fire/biz-group';
import {STRINGS} from '../biz-common/commons';
import * as firebase from 'firebase';
@Component({
  selector: 'app-selector',
  templateUrl: './selector.page.html',
  styleUrls: ['./selector.page.scss'],
})
export class SelectorPage extends TakeUntil implements OnInit {

  groups: IBizGroup[];
  langPack = {};

  constructor(
      private bizFire : BizFireService,
      private router : Router,
      private electronService : Electron,
  ) {
    super();
  }

  ngOnInit() {

    this.bizFire.onLang.subscribe((l: any) => this.langPack = l.pack());

    this.loadGroups();
  }


  private async loadGroups() {

    const userData = await this.bizFire.promiseCurrentUser();
    // find all biz group
    this.bizFire.afStore.collection(STRINGS.STRING_BIZGROUPS, ref => {
      let query: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
      query = query.where(new firebase.firestore.FieldPath(STRINGS.FIELD.MEMBER, userData.uid),'==', true);
      query = query.where('status', '==', true);
      return query;
    }).snapshotChanges()
        .pipe(this.bizFire.takeUntilUserSignOut,this.takeUntil)
        .subscribe((changes: any[]) => {
          this.groups = changes.map(d=>(BizGroupBuilder.buildWithOnStateChangeAngularFire(d, this.bizFire.uid)));

          //그룹이 없는 경우 그룹선택,작성 페이지로 이동
          if(this.groups.length === 0){

            //  그룹이 없을 경우 액션.
            console.error('그룹이 현재 없슴.  그룹생성 ??');

          }
        });
  }


  async gotoTeam(group : IBizGroup) {
    if(group && group.gid) {
      try {
        console.log("select Group :",group);
        //start load group
        await this.bizFire.loadBizGroup(group.gid);
        await this.router.navigate([`/${this.bizFire.configService.firebaseName}/tabs`], {replaceUrl: true});
      } catch (e) {
        console.error(`this.bizFire.loadBizGroup(${group.gid}) error.`);
        console.error(e);
        await this.bizFire.signOut();
        await this.router.navigate(['/login'], {replaceUrl: true});
      }
    }
  }


  windowMimimize() {
    this.electronService.windowMimimize();
  }


  windowHide() {
    this.electronService.windowHide();
  }

}
