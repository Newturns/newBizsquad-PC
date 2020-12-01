import {Component} from '@angular/core';
import {BizFireService} from '../biz-fire/biz-fire';
import {IBizGroup} from '../_models';
import {Router} from '@angular/router';
import {Electron} from '../providers/electron';

import {UserStatusProvider} from '../core/user-status';
import {debounceTime, filter, takeUntil} from 'rxjs/operators';
import {combineLatest} from 'rxjs';
import {Subject} from 'rxjs';
import {UnreadService} from '../providers/unread.service';
import {IMessageData} from '../_models/message';
import {NotificationService} from '../core/notification.service';

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
      private userStatusService: UserStatusProvider,
      private notificationService : NotificationService,
      private unreadService: UnreadService,) {

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

    this.unreadService.unreadList$
        .pipe(
            debounceTime(100),
            takeUntil(this._unsubscribeAll),
        )
        .subscribe((list: IMessageData[])=>{

          if(list && list.length > 0) {
            this.chatUnreadCount = list.filter(list => list.gid === this.bizFire.gid).length;
            this.electronService.setAppBadge(this.chatUnreadCount);
          } else {
            this.chatUnreadCount = 0;
            this.electronService.setAppBadge(0);
          }
        });
    combineLatest(this.unreadService.unreadList$,this.notificationService.onNotifications)
        .pipe(
            debounceTime(100),
            takeUntil(this._unsubscribeAll),
        ).subscribe(([chatList, notifyList])=>{
          if(chatList && chatList.length > 0) {
            this.chatUnreadCount = chatList.filter(list => list.gid === this.bizFire.gid).length;
          } else {
            this.chatUnreadCount = 0;
          }
          if(notifyList && notifyList.length > 0) {
            this.newNotifyCount = notifyList.filter(m => m.data.statusInfo.done !== true).length;
          } else {
            this.newNotifyCount = 0;
          }
          this.electronService.setAppBadge(this.chatUnreadCount + this.newNotifyCount);
    });
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
