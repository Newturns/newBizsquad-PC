import { Component, OnInit } from '@angular/core';
import {combineLatest, Observable, Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {BizFireService} from '../../biz-fire/biz-fire';
import {ChatService} from '../../providers/chat.service';
import {IChat} from '../../_models/message';
import {IBizGroup, IUser} from '../../_models';
import {CacheService} from '../../core/cache/cache';
import {Commons} from '../../biz-common/commons';
import {PopoverController} from '@ionic/angular';

@Component({
  selector: 'app-invite-chat-popover',
  templateUrl: './invite-chat-popover.component.html',
  styleUrls: ['./invite-chat-popover.component.scss'],
})
export class InviteChatPopoverComponent implements OnInit {

  private _unsubscribeAll;

  langPack = {};

  roomData : IChat;

  userList$: Observable<IUser[]>;

  currentGroup: IBizGroup;

  isChecked : IUser[] = [];

  groupSubColor: string;

  constructor(private bizFire : BizFireService,
              private cacheService : CacheService,
              private popoverCtrl : PopoverController,
              private chatService : ChatService) {

    this._unsubscribeAll = new Subject<any>();

    this.bizFire.onLang
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((l: any) => {
          this.langPack = l.pack();
        });
  }

  ngOnInit() {
    combineLatest(this.chatService.onSelectChatRoom,this.bizFire.onBizGroupSelected)
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(([chat,group]) => {
          this.roomData = chat;
          this.currentGroup = group;
          this.groupSubColor = group.data.team_subColor;

          const inviteUids = this.currentGroup.getMemberIds(false)
              .filter(uid => Object.keys(this.roomData.data.members)
                  .find(cUid => cUid === uid) == null);

          this.userList$ = this.cacheService.resolvedUserList(inviteUids, Commons.userInfoSorter);
        });
  }

  invite(){
    let members = {};
    let makeNoticeUsers = [];
    this.isChecked.forEach(d => {
      members[d.data.uid] = true;
      makeNoticeUsers.push(d.data.uid);
    });
    this.bizFire.afStore.doc(Commons.chatDocPath(this.roomData.data.gid,this.roomData.cid)).set({
      members : members
    },{merge : true}).then(() =>{
      this.chatService.makeRoomNoticeMessage('member-chat','invite',this.roomData.data.gid,this.roomData.cid,makeNoticeUsers);
      this.popoverCtrl.dismiss();
    })
  }

  checkedUsers(user : IUser) {
    if(user['checked']) {
      user['checked'] = false;
    } else {
      user['checked'] = true;
      this.isChecked.push(user);
    }
    this.isChecked = this.isChecked.filter(user => user['checked'] === true);
    console.log(this.isChecked);
  }

  async closePopup(){
    await this.popoverCtrl.dismiss();
  }

  ngOnDestroy(): void {
    this.isChecked.forEach(u => u.data.isChecked = false);
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

}
