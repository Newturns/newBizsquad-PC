import {Component, Input} from '@angular/core';
import {IChat} from "../../_models/message";
import {Commons} from "../../biz-common/commons";
import {IUser} from "../../_models";
import {TakeUntil} from "../../biz-common/take-until";


import {MembersPopoverComponent} from "../members-popover/members-popover";
import {ChangeTitlePopoverComponent} from "../change-title-popover/change-title-popover";
import {WarnPopoverComponent} from "../warn-popover/warn-popover";
import * as firebase from "firebase";
import {AlertController, PopoverController} from '@ionic/angular';
import {BizFireService} from '../../biz-fire/biz-fire';
import {Electron} from '../../providers/electron';
import {CacheService} from '../../core/cache/cache';
import {ChatService} from '../../providers/chat.service';


@Component({
  selector: 'chat-header',
  templateUrl: 'chat-header.html'
})
export class ChatHeaderComponent extends TakeUntil {

  public memberChat : boolean = false;

  notifications = 'Icon_Outline_bell' || 'Icon_Outline_bell_off';
  private userCustomData : any;

  senderUid : string;

  langPack = {};

  @Input()
  set chat(room: IChat) {
    if(room) {
      let reload = true;
      this.senderUid = room.data.lastMessage.sender;
      if(this.room){
        const oldCount = this._room.isPublic()? this.bizFire.currentBizGroup.getMemberCount() : this._room.getMemberCount();
        const newCount = room.isPublic() ? this.bizFire.currentBizGroup.getMemberCount() : room.getMemberCount();
        // member 수가 다를 때만 리로드.
        reload = oldCount !== newCount;
      }

      this._room = room;

      if(reload){
        this.reloadTitle();
      }
    }
  }

  get room(): IChat {
    return this._room;
  }

  private _room : IChat;

  //윈도우 창 투명도 설정.
  public opacity = 100;

  //채팅방 이름,멤버수
  public chatTitle : string = '';
  public userCount : number = 0;


  constructor(
    public electron : Electron,
    private popoverCtrl :PopoverController,
    private bizFire : BizFireService,
    private cacheService : CacheService,
    private alertCtrl : AlertController,
    private chatService : ChatService
  ) {
    super();

    this.bizFire.onLang
      .pipe(this.takeUntil)
      .subscribe((l: any) => {
        this.langPack = l.pack();
      });

    this.bizFire.userData
      .pipe(this.takeUntil)
      .subscribe(data => {
        this.userCustomData = data;
        if(this.userCustomData[this.room.cid] == null ||
          this.userCustomData[this.room.cid]['notify'] == null){
          this.notifications = 'Icon_Outline_bell';
        } else {
          this.notifications = this.userCustomData[this.room.cid]['notify'] === true ? 'Icon_Outline_bell' : 'Icon_Outline_bell_off';
        }
      });
  }

  notificationOnOff() {
    const noStatus = this.notifications !== 'Icon_Outline_bell';
    console.log(this.room.cid, 'Icon_Outline_bell_off', `set to`, noStatus);
    // get delete or add
    this.bizFire.userDataRef.set({[this.room.cid]: { notify: noStatus }}, {merge: true});
  }


  reloadTitle() {

    if(this.room == null){
      return;
    }

    this.chatService.onSelectChatRoom
    .subscribe((chat : IChat) => {
      if(this.room.data.title !== chat.data.title)
        this.chatTitle = chat.data.title;
    });

    this.memberChat = this.room.data.type === 'member';

    if(!this.memberChat) {

      this.userCount = this.room.isPublic() ? this.bizFire.currentBizGroup.getMemberCount() : this.room.getMemberCount();
      this.chatTitle = this.room.data.name;

    } else {

      this.userCount = this.room.getMemberCount();
      this.chatTitle = this.room.data.title;

      if(this.chatTitle == null) {

        this.chatTitle = '';
        this.cacheService.resolvedUserList(this.room.getMemberIds(false), Commons.userInfoSorter)
          .subscribe((users: IUser[]) => {

            users.forEach(u => {
              if (this.chatTitle.length > 0) {
                this.chatTitle += ',';
              }
              this.chatTitle += u.data.displayName;
            });
            if (users.length === 0) {
              this.chatTitle = "There are no members to chat with.";
            }
          });

      }
    }
  }



  //Chat invite Popover
  presentPopover(ev): void {
    console.log(this.memberChat);
    console.log(this.room.data.type);
    // let popover = this.popoverCtrl.create('page-member-chat-menu',{}, {cssClass: 'page-member-chat-menu'});

    // popover.present({ev: ev});
    //
    // popover.onDidDismiss(data => {
    //   if(data === 'title') {
    //
    //     console.log("채팅방 이름변경 시작");
    //     this.changeTitle(ev);
    //
    //   } else if(data === 'leave') {
    //
    //     console.log("채팅방 나가기 클릭");
    //     this.leaveChatRoom(ev);
    //
    //   } else {
    //     return;
    //   }
    // });
  }

  //chat member list
  chatMemberList(ev): void {
    // let popover = this.popoverCtrl.create(MembersPopoverComponent,{}, {cssClass: 'members-popover'});
    // popover.present({ev: ev});
  }

  changeTitle(ev): void {
    // let titlePopover = this.popoverCtrl.create(ChangeTitlePopoverComponent,
    //   {title: this.chatTitle}, {cssClass: 'change-title-popover'});
    // titlePopover.present({ev: ev});
    //
    // titlePopover.onDidDismiss(data => {
    //   if(data) {
    //     console.log("헤더에서 받는 변경된 채팅방 명 ::",data);
    //     this._room.ref.set({ title: data },{merge : true});
    //   }
    // });
  }

  leaveChatRoom(ev): void {
    // let warnPopover = this.popoverCtrl.create(WarnPopoverComponent,
    //   {title:this.langPack['leave_chat'],description:this.langPack['leave_chat_desc']}, {cssClass: 'warn-popover'});
    // warnPopover.present({ev: ev});
    //
    // warnPopover.onDidDismiss(value => {
    //   if(value) {
    //     console.log("방나가기");
    //     this._room.ref.update({
    //       ['members.'+this.bizFire.uid]: firebase.firestore.FieldValue.delete()
    //     }).then(() => {
    //       const text = this.langPack['chat_exit_user_notice'].replace('$DISPLAYNAME', this.bizFire.currentUserValue.displayName);
    //       this.chatService.makeRoomNoticeMessage('member-chat','exit',this.bizFire.gid,this._room.cid,[this.bizFire.uid])
    //         .then(() => {
    //           this.electron.windowClose();
    //         });
    //     })
    //   }else {
    //     return;
    //   }
    // });
  }
}
