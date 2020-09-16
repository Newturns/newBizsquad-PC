import {Component} from '@angular/core';
import {BizFireService} from '../biz-fire/biz-fire';
import {IBizGroup} from '../_models';
import {Router} from '@angular/router';
import {Electron} from '../providers/electron';

import {IUnreadMap} from '../components/classes/unread-counter';
import {ChatService} from '../providers/chat.service';

import {UserStatusProvider} from '../core/user-status';
import {filter, takeUntil} from 'rxjs/operators';
import {Subject} from 'rxjs';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
})

export class TabsPage {

  langPack = {};

  group : IBizGroup;
  teamColor : string = '#324CA8';
  selectTabName : string;

  newNotifyCount: number = 0;

  chatUnreadCount = 0;

  chatRooms = [];

  private _unsubscribeAll;

  constructor(
      private bizFire : BizFireService,
      private router : Router,
      private electronService : Electron,
      private chatService : ChatService,
      private userStatusService: UserStatusProvider) {

    // this.electronService.ipcRenderer.on('progress',(e,m) => {
    //   console.log(m);
    // });
  }

  ionViewWillEnter() {
    // 채팅이 아닌 메인 윈도우를 우클릭으로 완전 종료시 유저상태변경하는 리스너.(파이어베이스의 유저상태);
    window.addEventListener('unload', () => {
      this.bizFire.signOut();
    });

    this.userStatusService.onUserStatusChange();

    this._unsubscribeAll = new Subject<any>();

    this.bizFire.onLang.pipe(takeUntil(this._unsubscribeAll))
    .subscribe((l: any) => {
      this.langPack = l.pack();
    });

    this.bizFire.onBizGroupSelected
    .pipe(filter(d=>d!=null),takeUntil(this._unsubscribeAll))
    .subscribe((group : IBizGroup) => {
      this.group = group;
      this.teamColor = this.group.data.team_color;
    });

    // this.chatUnreadCount = 1;

    // this.bizFire.afStore.collectionGroup('chat',ref=>
    //     ref.where('status', '==', true)
    //         .where(`memberArray`, 'array-contains', this.bizFire.uid)
    // ).stateChanges(['added', 'removed']);
  }

  changeTabs(e) {
    //탭을 선택하면 이벤트 발생.
    //현재 선택된 탭 이름을 가져온다 (string)
    this.selectTabName = e.tab;
  }

  groupSelectPage() {
    this.router.navigate([`/${this.bizFire.configService.firebaseName}/selector`],{replaceUrl: true});
  }

  windowMimimize() {
   this.electronService.windowMimimize();
  }

  windowHide() {
    this.electronService.windowHide();
  }

  ionViewDidLeave() {
    this.chatUnreadCount = 0;
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }
}
