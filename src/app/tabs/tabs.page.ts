import { Component, OnInit } from '@angular/core';
import {LangService} from '../core/lang.service';
import {TakeUntil} from '../biz-common/take-until';
import {BizFireService} from '../biz-fire/biz-fire';
import {IBizGroup, INotification, IUnreadItem} from '../_models';
import {Router} from '@angular/router';
import {Electron} from '../providers/electron';
import {NotificationService} from '../core/notification.service';
import {filter, switchMap, takeUntil} from 'rxjs/operators';
import {SquadService} from '../providers/squad.service';
import {of, Subject, Subscription, timer} from 'rxjs';
import {IChat} from '../_models/message';
import {Chat} from '../biz-common/chat';
import { UnreadCounter } from '../components/classes/unread-counter';
import {ChatService} from '../providers/chat.service';
import {Commons} from '../biz-common/commons';
import {UserStatusProvider} from '../core/user-status';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
})
export class TabsPage implements OnInit {

  langPack = {};

  group : IBizGroup;
  teamColor : string = '#324CA8';
  selectTabName : string;

  newNotifyCount: number = 0;

  chatCount = 0;

  chatRooms = [];
  private _unsubscribeAll;

  private unreadCounter: UnreadCounter;
  private unreadListSubscription: Subscription;

  constructor(
      private lang : LangService,
      private bizFire : BizFireService,
      private router : Router,
      private electronService : Electron,
      private notificationService : NotificationService,
      private chatService : ChatService,
      private userStatusService: UserStatusProvider,
      private squadService : SquadService) {

    this._unsubscribeAll = new Subject<any>();

    this.userStatusService.onUserStatusChange();

    // 채팅이 아닌 메인 윈도우를 우클릭으로 완전 종료시 유저상태변경하는 리스너.(파이어베이스의 유저상태);
    window.addEventListener('unload', () => {
      this.bizFire.signOut();
    });
  }

  ngOnInit() {
    this.lang.onLangMap.pipe(takeUntil(this._unsubscribeAll)).subscribe(l => { this.langPack = l });

    // this.chatService.startGetChatList();
    this.bizFire.onBizGroupSelected
        .pipe(filter(d=>d!=null),takeUntil(this._unsubscribeAll),
            switchMap(group => {

              // 그룹에서 탈퇴당하거나 그룹이 비활성화 되면...
              if(!group.data.members[this.bizFire.uid] && group.data.status === false) {
                this.groupSelectPage();
              }

              //* have group changed?
              let reloadGroup = true;
              // if(this.group != null){
              //   reloadGroup = this.group.gid !== group.gid;
              // }

              this.group = group;
              this.teamColor = this.group.data.team_color;

              console.log("언리드 모니터 시작");
              // 모든 채팅의 UNREAD COUNT 를 모니터
              this.unreadCounter = new UnreadCounter(this.group.gid, this.bizFire.uid);
              this.unreadListSubscription = this.unreadCounter.unreadList$.subscribe(this.chatService.unreadCountMap$);

              if(reloadGroup === true){
                // group squads reloading...
                return this.squadService.getMySquadLisObserver(this.group.gid);
              } else {
                // gid not changed.
                return of(null);
              }
            }),
            takeUntil(this._unsubscribeAll),
            filter(l => l != null) // prevent same group reloading.
        ).subscribe((list : IChat[]) => {
      console.log("스쿼드 리스트 :",list);
      const newChat = list.map(l => {
        return new Chat(l.sid , l.data, this.bizFire.uid, l.ref);
      }).filter(sChat => {
        if(this.group.isPartner()) {
          return sChat.data.agile;
        } else {
          return true;
        }
      });

      this.squadService.onSquadListChanged.next(newChat);

      list.forEach(s => {
        // private 스쿼드만 채팅이 존재함.
        if(s.data.type === 'private') {
          if(!this.unreadCounter.isRegistered(s.sid)) {
            this.unreadCounter.register(s.sid, s.ref);
          }
        }
      });
    });

    this.bizFire.afStore.collection(Commons.chatPath(this.group.gid),ref =>{
      return ref.where('status', '==' ,true).where(`members.${this.bizFire.currentUID}`, '==', true);
    })
    .stateChanges()
    .pipe(takeUntil(this._unsubscribeAll))
    .subscribe((changes : any) => {
      changes.forEach(change => {
        const data = change.payload.doc.data();
        const mid = change.payload.doc.id;

        if(change.type === 'added') {
          const item = new Chat(mid, data, this.bizFire.uid, change.payload.doc.ref);
          this.chatRooms.push(item);
          this.unreadCounter.register(mid, change.payload.doc.ref);

        } else if(change.type === 'modified') {
          for(let index = 0 ; index < this.chatRooms.length; index ++){
            if(this.chatRooms[index].cid === mid){
              // find replacement
              const item = new Chat(mid, data, this.bizFire.uid, change.payload.doc.ref);

              //---------- 껌벅임 테스트 -------------//
              this.chatRooms[index] = item; // data 만 경신 한다.
              console.log("Type Modified : ",this.chatRooms[index]);
              //-----------------------------------//

              break;
            }
          }
        } else if (change.type === 'removed') {
          for (let index = 0; index < this.chatRooms.length; index++) {
            if (this.chatRooms[index].cid === mid) {
              // remove from array
              this.chatRooms.splice(index, 1);
              this.unreadCounter.unRegister(mid);
              break;
            }
          }
        }
      });
      this.chatService.onChatRoomListChanged.next(this.chatRooms);
    });

    this.notificationService.onNotifications
    .pipe(takeUntil(this._unsubscribeAll),filter(m => m != null))
    .subscribe(async (m: INotification[]) => {
      const unreadNotify = m.filter(n => n.data.statusInfo.done === false);
      this.newNotifyCount = unreadNotify.filter(notify => notify.data.gid === this.bizFire.gid).length;
    });

    this.chatService.unreadCountMap$
    .pipe(takeUntil(this._unsubscribeAll))
    .subscribe((map: IUnreadItem[]) => {
      if(map){
        this.chatCount = map.length;
        // this.electron.setAppBadge(this.chatCount);
      }
    });

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
    console.log('tabs : ngOndestroy');
    this.clear();
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
    // this.electronService.setAppBadge(0);
  }

  clear(){

    //just unsubscribe old one.
    if(this.unreadCounter){

      // unreadCounter 가 보내는 현 그룹의 언리드 리스트인
      // unreadList$ 가 받는 구독을 먼저 해제한다.
      if(this.unreadListSubscription){
        this.unreadListSubscription.unsubscribe();
        this.unreadListSubscription = null;
      }
      // 데이터를 지운다.
      this.unreadCounter.clear();
      this.unreadCounter = null; // always create new one with new GID.
    }
    this.squadService.onSquadListChanged.next(null);
  }
}
