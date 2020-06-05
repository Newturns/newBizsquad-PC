import { Component, OnInit } from '@angular/core';
import {TakeUntil} from '../../biz-common/take-until';
import {Electron} from '../../providers/electron';
import {BizFireService} from '../../biz-fire/biz-fire';
import {IBizGroup, IUnreadItem, IUser} from '../../_models';
import {ChatService} from '../../providers/chat.service';
import {Subject} from 'rxjs';
import {distinctUntilChanged, filter, map, takeUntil} from 'rxjs/operators';
import {IChat} from '../../_models/message';
import {Commons} from '../../biz-common/commons';
import {CacheService} from '../../core/cache/cache';
import {SquadService} from '../../providers/squad.service';
import {ConfigService} from '../../config.service';
import {GroupColorProvider} from '../../biz-common/group-color';
import {PopoverController} from '@ionic/angular';

import {CreateChatPopoverComponent} from '../../components/create-chat-popover/create-chat-popover.component';
import {IUnreadMap, MapItem} from '../../components/classes/unread-counter';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
})
export class ChatPage implements OnInit {

  langPack = {};

  segmentName : string = 'squadChatRoom';

  group : IBizGroup;

  searchKeyword = '';

  chatRooms : IChat[];
  squadChatRooms: IChat[];

  memberUnreadTotalCount = 0;
  squadUnreadTotalCount = 0;

  // sort distinct and debounce subject
  sortChatRooms$ = new Subject<string>();

  private _unsubscribeAll;

  constructor(private electronService : Electron,
              private chatService : ChatService,
              private cacheService : CacheService,
              private squadService : SquadService,
              private configService: ConfigService,
              private groupColorProvider: GroupColorProvider,
              private popoverCtrl : PopoverController,
              private bizFire : BizFireService) {
  }

  ionViewWillEnter() {
    this._unsubscribeAll = new Subject<any>();

    console.log("-------- ngOnInit chat -----------");
    this.bizFire.onLang.pipe(takeUntil(this._unsubscribeAll)).subscribe((l: any) => this.langPack = l.pack());

    this.bizFire.onBizGroupSelected
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((group : IBizGroup) => {
          this.group = group;
        });

    // 멤버 채팅방
    this.chatService.chatList$
        .pipe(filter(d=>d!=null),takeUntil(this._unsubscribeAll),map((chats : IChat[]) => {
              return chats.map((chat : IChat) => {
                if(chat.data.title == null) {
                  this.cacheService.resolvedUserList(chat.getMemberIds(false), Commons.userInfoSorter)
                      .pipe(takeUntil(this._unsubscribeAll))
                      .subscribe((users :IUser[]) => {
                        chat.data.title = '';
                        users.forEach(u => {
                          if(chat.data.title.length > 0) {
                            chat.data.title += ',';
                          }
                          chat.data.title += u.data.displayName;
                        });
                        if(users.length === 0) {
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
    });

    // 스쿼드 채팅방
    this.chatService.squadChatList$
        .pipe(filter(d=>d != null),takeUntil(this._unsubscribeAll))
        .subscribe((squad : IChat[]) => {
          const onlyPrivateSquad = squad.filter(s => {
            return s.data.type === 'private' && s.data.members[this.bizFire.uid] === true;
          });
          this.squadChatRooms = onlyPrivateSquad;
        });

    // unread count map
    this.chatService.unreadCountMap$
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((list: IUnreadMap) => {
          // temp array for counting.
          this.memberUnreadTotalCount = 0;
          this.squadUnreadTotalCount = 0;
          list.getValues().forEach( (item: MapItem) => {
            if(item.chat.data.type === 'member'){
              this.memberUnreadTotalCount += item.unreadList.length;
            } else {
              this.squadUnreadTotalCount += item.unreadList.length;
            }
          });
        });
  }

  ionViewDidLeave() {

    console.log("-------- ngOnDestroy chat -----------");
    this.memberUnreadTotalCount = 0;
    this.squadUnreadTotalCount = 0;
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  ngOnInit() {
  }
  ngOnDestroy(): void {
  }


  onSearch(e) {
    const value = e.target.value;
    this.searchKeyword = value;
    console.log(this.memberUnreadTotalCount,this.squadUnreadTotalCount);
  }


  segmentChanged(e) {
    console.log(e.detail.value);
    this.segmentName = e.detail.value;
  }

  gotoRoom(c : IChat) {
    const cutRefValue = {cid: c.cid, data: c.data};
    this.chatService.onSelectChatRoom.next(c);
    this.electronService.openChatRoom(cutRefValue);
    console.log(c);
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
