import {Component, OnInit} from '@angular/core';
import {TakeUntil} from '../biz-common/take-until';
import {BizFireService} from '../biz-fire/biz-fire';
import {IBizGroup} from '../_models';
import {Router} from '@angular/router';
import {Electron} from '../providers/electron';

import {IUnreadMap} from '../components/classes/unread-counter';
import {ChatService} from '../providers/chat.service';

import {UserStatusProvider} from '../core/user-status';
import {filter} from 'rxjs/operators';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
})

export class TabsPage extends TakeUntil implements OnInit {

  langPack = {};

  group : IBizGroup;
  teamColor : string = '#324CA8';
  selectTabName : string;

  newNotifyCount: number = 0;

  chatUnreadCount = 0;

  chatRooms = [];

  constructor(
      private bizFire : BizFireService,
      private router : Router,
      private electronService : Electron,
      private chatService : ChatService,
      private userStatusService: UserStatusProvider) {
    super();

    this.userStatusService.onUserStatusChange();

    // 채팅이 아닌 메인 윈도우를 우클릭으로 완전 종료시 유저상태변경하는 리스너.(파이어베이스의 유저상태);
    window.addEventListener('unload', () => {
      this.bizFire.signOut();
    });

    this.bizFire.onLang.pipe(this.takeUntil).subscribe((l: any) => this.langPack = l.pack());

    this.electronService.ipcRenderer.on('progress',(e,m) => {
      console.log(m);
    });
  }

  ngOnInit() {
    this.bizFire.onBizGroupSelected
    .pipe(filter(d=>d!=null),this.takeUntil)
    .subscribe((group : IBizGroup) => {
      console.log("onBizGroupSelected !",group);
      this.group = group;
      this.teamColor = this.group.data.team_color;
    });

    this.chatService.unreadCountMap$
        .pipe(this.takeUntil)
        .subscribe((map: IUnreadMap)=> {
          this.chatUnreadCount = map.totalUnreadCount();
          console.log("chatUnreadCount ::",this.chatUnreadCount);
        });
  }

  changeTabs(e) {
    //탭을 선택하면 이벤트 발생.
    //현재 선택된 탭 이름을 가져온다 (string)
    this.selectTabName = e.tab;
    console.log("selectTabName : ",this.selectTabName);
  }

  groupSelectPage() {
    this.router.navigate([`/${this.bizFire.configService.firebaseName}/selector`]);
  }

  windowMimimize() {
   this.electronService.windowMimimize();
  }

  windowHide() {
    this.electronService.windowHide();
  }

  ngOnDestroy() {
    // this.electronService.setAppBadge(0);
  }
}
