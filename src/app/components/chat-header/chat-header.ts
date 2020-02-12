import {Component, Input} from '@angular/core';
import {IChat} from "../../_models/message";
import {Commons} from "../../biz-common/commons";
import {IUser, IUserData} from '../../_models';
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
import {ProfilePopoverComponent} from '../profile-popover/profile-popover.component';
import {ChatMenuPopoverComponent} from '../chat-menu-popover/chat-menu-popover.component';
import {eventNames} from 'cluster';
import {InviteChatPopoverComponent} from '../invite-chat-popover/invite-chat-popover.component';
import {Subscription} from 'rxjs';


@Component({
  selector: 'chat-header',
  templateUrl: 'chat-header.html',
  styleUrls: ['./chat-header.scss'],
})
export class ChatHeaderComponent extends TakeUntil {

  public memberChat : boolean = false;

  notifications = 'Icon_Outline_bell' || 'Icon_Outline_bell_off';
  private userCustomData : any;

  senderUid : string;

  langPack = {};

  autoTranslation: boolean = true;

  private userDataSubscription: Subscription;
  private selectRoomSubscription : Subscription;

  @Input()
  set chat(room: IChat) {
    if(room) {
      let reload = true;
      if(room.data.lastMessage) {
        this.senderUid = room.data.lastMessage.sender;
      }
      if(this.room){
        const oldCount = this._room.isPublic()? this.bizFire.currentBizGroup.getMemberCount() : this._room.getMemberCount();
        const newCount = room.isPublic() ? this.bizFire.currentBizGroup.getMemberCount() : room.getMemberCount();
        // member 수가 다를 때만 리로드.
        reload = oldCount !== newCount;
      }

      if(reload){

        this.reloadTitle(room);
        this.getUserData(room);
      }

      this._room = room;
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
    public bizFire : BizFireService,
    private cacheService : CacheService,
    private alertCtrl : AlertController,
    private chatService : ChatService
  ) {
    super();
    this.bizFire.onLang.pipe(this.takeUntil).subscribe((l: any) => this.langPack = l.pack());

  }

  ngOnInit() {
    this.bizFire.currentUser
    .pipe(this.takeUntil)
    .subscribe((uData : IUserData) => {
      if(uData.autoTranslation) {
        this.autoTranslation = uData.autoTranslation;
      } else {
        this.autoTranslation = false;
      }
    });
  }

  getUserData(room : IChat) {
    if(this.userDataSubscription != null) {
      this.userDataSubscription.unsubscribe();
      this.userDataSubscription = null;
    }

    this.userDataSubscription = this.bizFire.userData
    .pipe(this.takeUntil)
    .subscribe(data => {
      this.userCustomData = data;
      // this.autoTranslation = this.userCustomData.autoTranslation;
      console.log("userCustomData::",this.userCustomData);
      console.log(room);
      if(this.userCustomData[room.cid] == null ||
          this.userCustomData[room.cid]['notify'] == null){
        this.notifications = 'Icon_Outline_bell';
      } else {
        this.notifications = this.userCustomData[room.cid]['notify'] === true ? 'Icon_Outline_bell' : 'Icon_Outline_bell_off';
      }
    });
  }

  notificationOnOff() {
    const noStatus = this.notifications !== 'Icon_Outline_bell';
    console.log(this.room.cid, 'Icon_Outline_bell_off', `set to`, noStatus);
    // get delete or add
    this.bizFire.userDataRef.set({[this.room.cid]: { notify: noStatus }}, {merge: true});
  }


  reloadTitle(room : IChat) {

    if(room == null){
      return;
    }

    if(this.selectRoomSubscription != null) {
      this.selectRoomSubscription.unsubscribe();
      this.selectRoomSubscription = null;
    }

    this.selectRoomSubscription = this.chatService.onSelectChatRoom
    .subscribe((chat : IChat) => {
      if(room.data.title !== chat.data.title)
        this.chatTitle = chat.data.title;
    });

    this.memberChat = room.data.type === 'member';

    if(!this.memberChat) {

      this.userCount = room.isPublic() ? this.bizFire.currentBizGroup.getMemberCount() : room.getMemberCount();
      this.chatTitle = room.data.name;

    } else {

      this.userCount = room.getMemberCount();
      this.chatTitle = room.data.title;

      if(this.chatTitle == null) {

        this.chatTitle = '';
        this.cacheService.resolvedUserList(room.getMemberIds(false), Commons.userInfoSorter)
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

  changeTranslation(){
    this.autoTranslation = !this.autoTranslation;
    //자동번역설정값을 유저 DB에 격납하도록하자
    return this.bizFire.afStore.doc(Commons.userPath(this.bizFire.uid)).update({
      autoTranslation: this.autoTranslation
    });
  }

  //Chat invite Popover
  async presentPopover() {
    const popover = await this.popoverCtrl.create({
      component: ChatMenuPopoverComponent,
      animated: false,
      cssClass: ['page-member-chat-menu'],
      showBackdrop: false
    });
    await popover.present();

    await popover.onDidDismiss().then((e: any) => {
      const eventText = e.data;
      if(eventText === 'leave') {
        this.leaveChatRoom();
      } else if (eventText === 'title') {
        this.changeTitle();
      } else if (eventText === 'invite') {
        this.inviteChatRoom();
      } else {
        console.log("not event : close popover");
      }
    });
  }

  //chat member list
  async chatMemberList() {
    const popover = await this.popoverCtrl.create({
      component: MembersPopoverComponent,
      animated: false,
      componentProps: {title: this.chatTitle},
      cssClass: ['members-popover'],
      showBackdrop: false
    });
    await popover.present();
  }

  async changeTitle() {
    const popover = await this.popoverCtrl.create({
      component: ChangeTitlePopoverComponent,
      animated: false,
      componentProps: {title: this.chatTitle},
      cssClass: ['change-title-popover'],
    });
    await popover.present();

    popover.onDidDismiss().then((e : any) => {
      const title = e.data;
      if(title) {
        this._room.ref.set({ title: title },{merge : true});
      }
    });
  }

  async inviteChatRoom() {
    const popover = await this.popoverCtrl.create({
      component: InviteChatPopoverComponent,
      animated: false,
      cssClass: ['page-invite-room'],
    });
    await popover.present();
  }

  async leaveChatRoom() {
    const popover = await this.popoverCtrl.create({
      component: WarnPopoverComponent,
      animated: false,
      componentProps: {title:this.langPack['leave_chat'],description:this.langPack['leave_chat_desc']},
      cssClass: ['warn-popover'],
    });
    await popover.present();

    await popover.onDidDismiss().then((e :any) => {
      const ok = e.data;
      if(ok) {
        this._room.ref
        .update({['members.'+this.bizFire.uid]: firebase.firestore.FieldValue.delete()})
        .then(() => {
          this.chatService
          .makeRoomNoticeMessage('member-chat','exit',this.bizFire.gid,this._room.cid,[this.bizFire.uid])
          .then(() => this.electron.windowClose());
        })
      } else {
        return;
      }
    });
  }
}
