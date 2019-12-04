import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Commons} from "../../biz-common/commons";
import {TakeUntil} from "../../biz-common/take-until";
import {IChat, IMessageData} from "../../_models/message";
import {IUnreadItem, IUser} from "../../_models";
import {ChatService} from "../../providers/chat.service";
import {filter, map, takeUntil} from "rxjs/operators";
import {CacheService} from '../../core/cache/cache';
import {BizFireService} from '../../biz-fire/biz-fire';
import {LangService} from '../../core/lang.service';

@Component({
  selector: 'chat-room',
  templateUrl: 'chat-room.html'
})

export class ChatRoomComponent extends TakeUntil {

  myId : string;

  private _room : IChat;

  userCount: number = 0;
  unreadCount: number = 0;

  chatTitle: string = '';

  _squadChat: boolean;

  langPack: any;

  @Output()
  updated = new EventEmitter<any>();

  @Input()
  set squadChat(type : boolean) {
    this._squadChat = type;
  }
  get squadChat(): boolean {
    return this._squadChat;
  }

  @Input()
  set chat(room : IChat) {

    //console.log('room changed:', room);

    if(room) {
      let reload = true;

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

  @Input()
  set unread(count : number) {
    this.unreadCount = count;
  }

  @Output()
  onClick = new EventEmitter<any>();

  get room(): IChat {
    return this._room;
  }

  constructor(private cacheService: CacheService,
              private chatService : ChatService,
              private langService : LangService,
              private bizFire : BizFireService) {
    super();

    this.langService.onLangMap
      .pipe(this.takeUntil)
      .subscribe((l: any) => {
        this.langPack = l;
      });
  }


  ngOnInit() {
    this.myId = this.bizFire.uid;

    this.chatService.unreadCountMap$
    .pipe(
      this.takeUntil,
      filter(d=>d!=null)
    )
    .subscribe((list: IUnreadItem[]) => {

      // see only my unread
      list = list.filter(i=> i.cid === this.room.cid);

      //console.log('unread datas:', this.room.cid,  list.length);
      this.unreadCount = list.length;
    });


  }

  onSelectRoom(){
    this.onClick.emit(this._room);
  }

  reloadTitle(){

    if(this.room == null){
      return;
    }

    this._squadChat = this.room.data.type !== 'member';

    if(this._squadChat) {

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
            this.chatTitle = this.langPack['no_members'];
          }
        });

      }

    }
  }

  /*
  * last message 가 갱신되면 불린다.
  * */
  onLastMessageChanged(data: IMessageData){
    this.updated.emit({room: this.room, data: data});
  }

}
