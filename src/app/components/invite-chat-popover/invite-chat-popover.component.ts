import { Component, OnInit } from '@angular/core';
import {combineLatest, Subject} from 'rxjs';
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

  userList : IUser[] = [];
  checkedUser : IUser[] = [];

  currentGroup: IBizGroup;

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
        .subscribe(async ([chat,group]) => {
          this.roomData = chat;
          this.currentGroup = group;
          this.groupSubColor = group.data.team_subColor;

          const inviteUids = this.currentGroup.getMemberIdsExceptGuests(false)
              .filter(uid => this.roomData.data.memberArray.find(cUid => cUid === uid) == null);

          this.userList = await this.cacheService.resolvedUserList(inviteUids, Commons.userInfoSorter).toPromise();

        });
  }

  invite() {

    if(this.checkedUser.length > 0) {

      //기존 멤버.
      let memberArray = this.roomData.data.memberArray;

      //초대할 유저.
      const inviteUsers = this.checkedUser.map(user => user.uid);

      this.bizFire.afStore.doc(Commons.chatDocPath(this.roomData.data.gid,this.roomData.cid)).set({
        memberArray : memberArray.concat(inviteUsers)
      },{merge: true})
        .then(() => {
          this.chatService
              .makeRoomNoticeMessage('member-chat','invite',this.roomData.data.gid,this.roomData.cid,inviteUsers);
          this.popoverCtrl.dismiss();
        })
        .catch((e) => console.error(e));
    }

  }

  checkedUsers(user : IUser) {
    if(this.checkedUser.length > 0) {
      if(this.checkedUser.find(u => u.uid === user.uid)) {
        //이미 있으면 배열에서 삭제.
        this.checkedUser = this.checkedUser.filter(u => u.uid !== user.uid);
      } else {
        //없으면 배열에 추가.
        this.checkedUser.push(user);
      }
      return;
    }
    this.checkedUser.push(user);
  }

  isChecked(user : IUser) : boolean {
    return this.checkedUser.find(u => u.uid === user.uid) != null;
  }

  async closePopup(){
    await this.popoverCtrl.dismiss();
  }

  ngOnDestroy(): void {
    this.checkedUser = [];
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

}
