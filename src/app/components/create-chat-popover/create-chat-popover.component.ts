import { Component, OnInit } from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {BizFireService} from '../../biz-fire/biz-fire';
import {filter, takeUntil} from 'rxjs/operators';
import {IBizGroup, IUser} from '../../_models';
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

  private langPack = {};

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
          this.userList$ = this.cacheService.resolvedUserList(group.getMemberIds(false), Commons.userInfoSorter);
        });
  }

  invite(){
    let chatRooms = this.chatService.getChatRooms();

    console.log("chatRooms",chatRooms);

    let selectedRoom: IChat;
    let members = {
      [this.bizFire.currentUID] : true
    };
    if(this.isChecked){
      this.isChecked.forEach(u => {
        members[u.uid] = true;
      })
    }
    for(let room of chatRooms) {
      const member_list = room.data.members;
      // 유저 키값이 false가 되면 리스트에서 제외하고 같은방이있는지 검사해야함.

      if(deepEqual(members,member_list)) {
        selectedRoom = room;
        break;
      }
    }
    if(this.isChecked.length > 0) {
      if(selectedRoom == null){
        this.chatService.createRoomByFabs(this.isChecked);
        this.popoverCtrl.dismiss();
      } else {
        this.chatService.onSelectChatRoom.next(selectedRoom);
        this.electronService.openChatRoom({cid: selectedRoom.cid, data: selectedRoom.data});
        this.popoverCtrl.dismiss();
      }
    }
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
