import {Component, Input, OnInit} from '@angular/core';
import {filter, takeUntil} from "rxjs/operators";
import {BehaviorSubject, Observable} from "rxjs";
import {TakeUntil} from "../../biz-common/take-until";
import {IMessage} from "../../_models/message";
import {IUser} from "../../_models";
import {BizFireService} from '../../biz-fire/biz-fire';
import {CacheService} from '../../core/cache/cache';
import {ToastProvider} from '../../providers/toast';
import {TokenProvider} from '../../biz-common/token';


@Component({
  selector: 'biz-chat-notice',
  templateUrl: './chat-notice.component.html',
  styleUrls: ['./chat-notice.component.scss'],
})
export class ChatNoticeComponent extends TakeUntil implements OnInit {

  @Input()
  message: IMessage;

  langPack = {};

  // use to display notice
  private noticeMessageSubject = new BehaviorSubject<string>('hello');

  constructor(private bizFire : BizFireService,
              private tokenService : TokenProvider,
              private cacheService : CacheService) {
    super();
    this.bizFire.onLang
    .pipe(filter(g=>g!=null),this.takeUntil)
    .subscribe((l: any) => {
      this.langPack = l.pack('squad');
    });
  }

  ngOnInit() {
  }

  makeNoticeMessage(): Observable<string> {

    if(Object.keys(this.langPack).length > 0
        && this.message
        && this.message.data.isNotice
        && this.message.data.message.notice
    ){
      const notice = this.message.data.message.notice;
      if(notice.type === 'exit'){
        const uid = notice.uid;
        if(uid){
          this.cacheService.userGetObserver(uid[0]).subscribe((user: IUser) => {
            if(user){
              const text = this.langPack['chat_exit_user_notice'].replace('$DISPLAYNAME', user.data.displayName);
              this.noticeMessageSubject.next(text);
            }
          });
        }
      }

      if(notice.type === 'init'){
        const text = this.langPack['create_chat_room'];
        this.noticeMessageSubject.next(text);
      }
      if(notice.type === 'invite'){
        const uids = notice.uid;
        let inviteUserNames = '';
        for(let uid of uids) {
          this.cacheService.userGetObserver(uid).subscribe((user : IUser) => {
            if(user && user.data.displayName) {
              if(inviteUserNames.length > 0){
                inviteUserNames += ',';
              }
              inviteUserNames += user.data.displayName;
            }
          })
        }
        const text = this.langPack['chat_invite_user_notice'].replace('$DISPLAYNAME',inviteUserNames);
        this.noticeMessageSubject.next(text);
      }
      if(notice.type === 'video'){
        const uid = notice.uid;
        if(uid){
          this.cacheService.userGetObserver(uid[0]).subscribe((user: IUser) => {
            if(user){
              const text = this.langPack['video_notice_msg'].replace('$DISPLAYNAME',user.data.displayName);
              this.noticeMessageSubject.next(text);
            }
          });
        }
      }
    }
    return this.noticeMessageSubject.asObservable();
  }

  joinVideo() {
    this.tokenService.makeWebJump('video_chat');
  }

}
