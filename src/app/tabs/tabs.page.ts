import { Component, OnInit } from '@angular/core';
import {LangService} from '../core/lang.service';
import {TakeUntil} from '../biz-common/take-until';
import {BizFireService} from '../biz-fire/biz-fire';
import {IBizGroup, INotification} from '../_models';
import {Router} from '@angular/router';
import {Electron} from '../providers/electron';
import {NotificationService} from '../core/notification.service';
import {filter, switchMap} from 'rxjs/operators';
import {SquadService} from '../providers/squad.service';
import {of} from 'rxjs';
import {IChat} from '../_models/message';
import {Chat} from '../biz-common/chat';
import {IUnreadMap, UnreadCounter} from '../components/classes/unread-counter';
import {ChatService} from '../providers/chat.service';

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

  chatCount = 0;

  constructor(
      private lang : LangService,
      private bizFire : BizFireService,
      private router : Router,
      private electronService : Electron,
      private noifictionServie : NotificationService,
      private chatService : ChatService,
      private unreadCounter: UnreadCounter,
      private squadService : SquadService) {
    super();

    // 채팅이 아닌 메인 윈도우를 우클릭으로 완전 종료시 유저상태변경하는 리스너.(파이어베이스의 유저상태);
    window.addEventListener('unload', () => {
      this.bizFire.signOut();
    });
  }

  ngOnInit() {
    this.lang.onLangMap.pipe(this.takeUntil).subscribe(l => { this.langPack = l });

    this.bizFire.onBizGroupSelected
    .pipe(this.takeUntil,switchMap((group:IBizGroup) => {
      if(group && group.data) {
        if(group.data.team_color) {
          this.teamColor = group.data.team_color;
        }
        if(!group.data.members[this.bizFire.uid] && group.data.status === false) {
          this.groupSelectPage();
        }
        //* have group changed?
        let reloadGroup = true;
        if(this.group != null){
          reloadGroup = this.group.gid !== group.gid;
        }
        this.group = group;

        if(reloadGroup === true){
          // group squads reloading...
          return this.squadService.getMySquadLisObserver(this.group.gid);
        } else {
          // gid not changed.
          return of(null);
        }
      }
    }),filter(l => l != null))
    .subscribe((list : IChat[])=>{
      console.log("스쿼드 리스트 :",list);
      const newChat = list.map(l => {
        return new Chat(l.sid , l.data, this.bizFire.uid, l.ref);
      });
      this.squadService.onSquadListChanged.next(newChat);
    });

    this.noifictionServie.onNotifications
    .pipe(this.takeUntil,filter(m => m != null))
    .subscribe(async (m: INotification[]) => {
      const unreadNotify = m.filter(n => n.data.statusInfo.done === false);
      console.log("unreadNotify :::",unreadNotify);
      this.newNotifyCount = unreadNotify.filter(notify => notify.data.gid === this.bizFire.gid).length;
    });

    this.chatService.unreadCountMap$
    .pipe(this.takeUntil)
    .subscribe((list: IUnreadMap) => {
      this.chatCount = list.totalUnreadCount();
      // this.electronService.setAppBadge(this.chatCount);
    });

    this.chatService.startGetChatList();
  }

  changeTabs(e) {
    //탭을 선택하면 이벤트 발생.
    //현재 선택된 탭 이름을 가져온다 (string)
    this.selectTabName = e.tab;
    console.log("selectTabName : ",this.selectTabName);
  }

  groupSelectPage() {
    this.router.navigate([`/${this.bizFire.configService.firebaseName}/selector`], {replaceUrl: true});
  }

  windowMimimize() {
   this.electronService.windowMimimize();
  }

  windowHide() {
    this.electronService.windowHide();
  }

  ngOnDestroy(): void {
    this.chatService.clearUnreadCount();
    // this.electronService.setAppBadge(0);
  }
}
