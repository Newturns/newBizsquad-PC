import { Component, OnInit } from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {BizFireService} from '../../biz-fire/biz-fire';
import {filter, takeUntil} from 'rxjs/operators';
import {IUser} from '../../_models';
import {Commons} from '../../biz-common/commons';
import {CacheService} from '../../core/cache/cache';
import {ChatService} from '../../providers/chat.service';
import {IChat} from '../../_models/message';
import {PopoverController} from '@ionic/angular';
import deepEqual from 'deep-equal';
import {Electron} from '../../providers/electron';

@Component({
  selector: 'app-create-chat-popover',
  templateUrl: './create-chat-popover.component.html',
  styleUrls: ['./create-chat-popover.component.scss'],
})
export class CreateChatPopoverComponent implements OnInit {

  private _unsubscribeAll;

  langPack = {};

  isChecked : IUser[] = [];

  groupSubColor: string;
  userList$: Observable<IUser[]>;

  constructor(private bizFire: BizFireService,
              private chatService: ChatService,
              private popoverCtrl : PopoverController,
              private electronService : Electron,
              private cacheService : CacheService) {
    this._unsubscribeAll = new Subject<any>();
    this.bizFire.onLang
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((l: any) => {
          this.langPack = l.pack();
        });
  }

  ngOnInit() {
    this.bizFire.onBizGroupSelected
        .pipe(filter(g=>g!=null),takeUntil(this._unsubscribeAll))
        .subscribe((group) => {
          this.groupSubColor = group.data.team_subColor;
          this.userList$ = this.cacheService.resolvedUserList(group.getMemberIdsExceptGuests(false), Commons.userInfoSorter);
        });
  }

  invite(){
    let chatRooms = this.chatService.getChatRooms();

    console.log("chatRooms",chatRooms);

    let selectedRoom: IChat = null;

    if(this.isChecked.length > 0) {
      const createChatUids = this.isChecked.map(u => u.uid);
      createChatUids.push(this.bizFire.uid);

      if(this.isChecked.length === 1) {
        for (let room of chatRooms) {
          const member_list = room.data.memberArray;
          if(member_list.length === 2 && createChatUids.filter(uid => member_list.includes(uid) !== true).length === 0) {
            selectedRoom = room;
            break;
          }
        }
      }

      if(selectedRoom) {
        this.chatService.onSelectChatRoom.next(selectedRoom);
        this.electronService.openChatRoom({cid: selectedRoom.cid, data: selectedRoom.data},this.bizFire.uid);
        this.bizFire.afStore.doc(Commons.userPath(this.bizFire.uid)).set({ lastChatId:{ pc: selectedRoom.cid } }, {merge: true});
        this.popoverCtrl.dismiss();
      } else {
        this.chatService.createRoomByFabs(this.isChecked);
        this.popoverCtrl.dismiss();
      }
    }

    // let members = {
    //   [this.bizFire.currentUID] : true
    // };
    //
    // if(this.isChecked){
    //   this.isChecked.forEach(u => {
    //     members[u.uid] = true;
    //   })
    // }
    // for(let room of chatRooms) {
    //   const member_list = room.data.members;
    //   // 유저 키값이 false가 되면 리스트에서 제외하고 같은방이있는지 검사해야함.
    //
    //   if(deepEqual(members,member_list)) {
    //     selectedRoom = room;
    //     break;
    //   }
    // }
    // if(this.isChecked.length > 0) {
    //   if(selectedRoom == null){
    //     this.chatService.createRoomByFabs(this.isChecked);
    //     this.popoverCtrl.dismiss();
    //   } else {
    //     this.chatService.onSelectChatRoom.next(selectedRoom);
    //     this.electronService.openChatRoom({cid: selectedRoom.cid, data: selectedRoom.data});
    //
    //     this.bizFire.afStore.doc(Commons.userPath(this.bizFire.uid))
    //         .set({ lastChatId:{ pc: selectedRoom.cid } }, {merge: true});
    //
    //     this.popoverCtrl.dismiss();
    //   }
    // }
  }

  checkedUsers(user : IUser) {
    if(user['checked']) {
      user['checked'] = false;
    } else {
      user['checked'] = true;
      this.isChecked.push(user);
    }
    this.isChecked = this.isChecked.filter(user => user['checked'] === true);
  }

  async closePopup() {
    await this.popoverCtrl.dismiss();
  }

  ngOnDestroy(): void {
    this.isChecked.forEach(u => u['checked'] = false);
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

}
