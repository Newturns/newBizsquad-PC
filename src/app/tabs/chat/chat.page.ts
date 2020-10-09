import { Component, OnInit } from '@angular/core';
import {Electron} from '../../providers/electron';
import {BizFireService} from '../../biz-fire/biz-fire';
import {IBizGroup, IUser} from '../../_models';
import {ChatService} from '../../providers/chat.service';
import { filter, map } from 'rxjs/operators';
import {IChat} from '../../_models/message';
import {Commons} from '../../biz-common/commons';
import {CacheService} from '../../core/cache/cache';
import {SquadService} from '../../providers/squad.service';
import {ConfigService} from '../../config.service';
import {GroupColorProvider} from '../../biz-common/group-color';
import {PopoverController} from '@ionic/angular';

import {CreateChatPopoverComponent} from '../../components/create-chat-popover/create-chat-popover.component';
import {TakeUntil} from '../../biz-common/take-until';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
})
export class ChatPage extends TakeUntil implements OnInit {

  langPack = {};

  segmentName : string = 'squadChatRoom';

  group : IBizGroup;

  searchKeyword = '';

  chatRooms : IChat[];
  squadChatRooms: IChat[];

  memberUnreadTotalCount = 0;
  squadUnreadTotalCount = 0;

  constructor(private electronService : Electron,
              private chatService : ChatService,
              private cacheService : CacheService,
              private squadService : SquadService,
              private configService: ConfigService,
              private groupColorProvider: GroupColorProvider,
              private popoverCtrl : PopoverController,
              private bizFire : BizFireService) {
    super();
  }

  ionViewWillEnter() {

  }

  ngOnInit() {
    console.log("-------- ngOnInit chat -----------");
    this.bizFire.onLang.pipe(this.takeUntil).subscribe((l: any) => this.langPack = l.pack());

    this.bizFire.onBizGroupSelected
        .pipe(this.takeUntil)
        .subscribe((group : IBizGroup) => {
          this.group = group;
        });

    // 멤버 채팅방
    this.chatService.chatList$
        .pipe(
            filter(d=>d!=null),
            this.takeUntil,
            map((chats : IChat[]) => {
              return chats.map((chat : IChat) => {
                if(chat.data.title == null) {
                  this.cacheService.resolvedUserList(chat.getMemberIds(false), Commons.userInfoSorter)
                      .pipe(this.takeUntil)
                      .subscribe((users :IUser[]) => {
                        chat.data.title = '';
                        chat.data.title = users.map(u => u.data.displayName).join(',');
                        if(users.length === 0) {
                          // no user left only me.
                          // add no user
                          chat.data.title = 'No users';
                        }
                      });
                }
                return chat;
              });
            })
        ).subscribe((rooms : IChat[]) => {
      // this.chatRooms = rooms.sort(Commons.sortDataByCreated());
      this.chatRooms = rooms;
      console.log("chatRooms",this.chatRooms);
    });

    // 스쿼드 채팅방
    this.chatService.squadChatList$
        .pipe(
            filter(d=>d != null),
            this.takeUntil,
        )
        .subscribe((squadChat : IChat[]) => {
          if(squadChat && squadChat.length > 0) {
            console.log("squadChatRooms",this.squadChatRooms);
            this.squadChatRooms = squadChat;
          }
        });
  }

  onSearch(e) {
    const value = e.target.value;
    this.searchKeyword = value;
  }


  segmentChanged(e) {
    console.log(e.detail.value);
    this.segmentName = e.detail.value;
  }

  gotoRoom(c : IChat) {
    this.chatService.onSelectChatRoom.next(c);
    this.chatService.saveLastChatId(c.cid);
    console.log(c);

    const cutRefValue = {cid: c.cid, data: c.data};
    this.electronService.openChatRoom(cutRefValue,this.bizFire.uid);

  }

  goLink(url) {
    this.electronService.goLink(url);
  }

  async createChatPopover() {
    const popover = await this.popoverCtrl.create({
      component: CreateChatPopoverComponent,
      animated: false,
      cssClass: ['page-invite'],
      showBackdrop: false,
    });
    await popover.present();
  }

}
