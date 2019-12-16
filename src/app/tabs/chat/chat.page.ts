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

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
})
export class ChatPage implements OnInit {

  langPack = {};

  segmentName : string = 'chatRoom';

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
              private bizFire : BizFireService) {
    this._unsubscribeAll = new Subject<any>();
  }

  ngOnInit() {

    this.bizFire.onLang.pipe(takeUntil(this._unsubscribeAll)).subscribe((l: any) => this.langPack = l.pack());

    this.bizFire.onBizGroupSelected
    .pipe(takeUntil(this._unsubscribeAll))
    .subscribe((group : IBizGroup) => {
      this.group = group;
    });

    this.chatService.unreadCountMap$
    .pipe(takeUntil(this._unsubscribeAll))
    .subscribe((list : IUnreadItem[]) => {
      // temp array for counting.
      const typeMember = [];
      const typeSquad = [];

      // get chat data
      list.filter(i => {
        const chat = this.chatService.findChat(i.cid);
        if(chat){
          if(chat.data.type === 'member'){
            typeMember.push(chat);
          } else {
            typeSquad.push(chat);
          }
        }
      });
      this.memberUnreadTotalCount = typeMember.length;
      this.squadUnreadTotalCount = typeSquad.length;

    });

    // 멤버 채팅방
    this.chatService.onChatRoomListChanged
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
      this.chatRooms = rooms.sort(Commons.sortDataByLastMessage(false));
    });

    // 스쿼드 채팅방
    this.squadService.onSquadListChanged
    .pipe(filter(d=>d != null),takeUntil(this._unsubscribeAll))
    .subscribe((squad : IChat[]) => {
      const onlyPrivateSquad = squad.filter(s => s.data.type !== 'public');
      // this.squadChatRooms = squad.sort(Commons.sortDataByCreated());
      this.squadChatRooms = onlyPrivateSquad.sort(Commons.sortDataByLastMessage(false));
    });


    /*
* sort 채팅방
* 마지막 메시지가 도착한 순으로 소팅
* */
    this.sortChatRooms$
        .pipe(takeUntil(this._unsubscribeAll),
            distinctUntilChanged() // 같은 채팅창이면 이미 소팅되어있으므로 무시
        )
        .subscribe((cid: string) => {
          let target;
          if(this.chatRooms){
            if(this.chatRooms.findIndex(c => c.cid === cid) !== -1) {
              // cid goes to top.
              target = this.chatRooms;
            }
          }
          if(!target && this.squadChatRooms){
            if(this.squadChatRooms.findIndex(c => c.cid === cid) !== -1) {
              target = this.squadChatRooms;
            }
          }
          console.log(target);
          if(target){
            target.sort( (a: IChat, b: IChat) => {
              let ret = 0;
              if(a.cid === cid){
                ret = -1; //a up
              } else if(b.cid === cid){
                ret = 1;//b up
              }
              return ret;
            });
          }
        });
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

}
