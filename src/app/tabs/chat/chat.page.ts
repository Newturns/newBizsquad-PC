import { Component, OnInit } from '@angular/core';
import {TakeUntil} from '../../biz-common/take-until';
import {Electron} from '../../providers/electron';
import {BizFireService} from '../../biz-fire/biz-fire';
import {IBizGroup} from '../../_models';
import {ChatService} from '../../providers/chat.service';
import {IUnreadMap, MapItem} from '../../components/classes/unread-counter';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
})
export class ChatPage extends TakeUntil implements OnInit {

  langPack = {};

  segmentName : string = 'chatRoom';

  group : IBizGroup;

  searchKeyword = '';

  memberUnreadTotalCount = 0;
  squadUnreadTotalCount = 0;

  constructor(private electronService : Electron,
              private chatService : ChatService,
              private bizFire : BizFireService) {
    super();
  }

  ngOnInit() {

    this.bizFire.onLang.subscribe((l: any) => this.langPack = l.pack());

    this.bizFire.onBizGroupSelected
    .pipe(this.takeUntil)
    .subscribe((group : IBizGroup) => {
      this.group = group;
    });

    this.chatService.unreadCountMap$
    .pipe(this.takeUntil)
    .subscribe((list : IUnreadMap) => {
      this.memberUnreadTotalCount = 0;
      this.squadUnreadTotalCount = 0;
      list.getValues().forEach( (item: MapItem) => {
        if(item.chat.data.type === 'member'){
          this.memberUnreadTotalCount += item.unreadList.length;
        } else {
          this.squadUnreadTotalCount += item.unreadList.length;
        }
      });
    })

  }


  onSearch(e) {
    const value = e.target.value;
    this.searchKeyword = value;
  }


  segmentChanged(e) {
    console.log(e.detail.value);
    this.segmentName = e.detail.value;
  }

  goLink(url) {
    this.electronService.goLink(url);
  }

}
