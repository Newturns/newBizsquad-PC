import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {delay, map, switchMap, take} from 'rxjs/operators';
import {TakeUntil} from "../../biz-common/take-until";
import {IChat, IFiles, IMessageData} from '../../_models/message';
import {Commons} from "../../biz-common/commons";
import {IUser} from '../../_models';
import {CacheService} from '../../core/cache/cache';
import {BizFireService} from '../../biz-fire/biz-fire';
import {BehaviorSubject, Observable, of} from 'rxjs';

@Component({
  selector: 'biz-chat-item',
  templateUrl: './chat-item.component.html',
  styleUrls: ['./chat-item.component.scss'],
})
export class ChatItemComponent extends TakeUntil implements OnInit {

  chatBox: IChat;

  @Input()
  set chat(c: IChat){
    this.loadChat(c);
  }

  lastMessage: IMessageData;

  //스쿼드 아이템이 선택됐을 때 css를 변경한다.
  @Input()
  chatSelected:boolean = false;

  @Input()
  squadColor:string;

  //박스내에 자물쇠, 코멘트 등의 이벤트가 필요할 때 쓰도록 한다.
  // @Input()
  // func:[]

  @Output()
  clickedFunc = new EventEmitter<any>();

  chatTitle: string;
  unreadCount: number = 0;

  chatIcon : IUser;

  noticeMessage$: BehaviorSubject<string>;

  langPack = {};

  unreadCount$: Observable<any>;

  constructor(private cacheService: CacheService,
              private bizFire : BizFireService) {
    super();
  }

  ngOnInit() {}

  onClickFunc(){
    this.clickedFunc.emit(this.chatBox);
  }

  private loadChat(c: IChat) {
    if(c != null) {
      this.chatBox = c;
      this.chatTitle = this.chatBox.data.title;
      this.lastMessage = this.chatBox.data.lastMessage;

      this.makeChatIcon();

      // notice message 를 준비한다.
      if(this.lastMessage && this.lastMessage.isNotice){
        if(this.noticeMessage$ == null){
          this.noticeMessage$ = new BehaviorSubject<string>(null);
        }
        this.makeNoticeMessage();
      }

      if(this.chatTitle == null){
        this.reloadTitle();
      }

      // this.unreadCount$ = this.bizFire.afStore.collection(`${c.ref.path}/chat`, ref=>
      //     ref.where(`read.${this.bizFire.uid}.unread`, '==', true)
      // ).valueChanges()
      //     .pipe(
      //         switchMap(list =>{
      //           if(this.chatSelected) return of(list).pipe(delay(250));
      //           return of(list);
      //         })
      //         ,map(data => data.length)
      //         ,this.takeUntil
      //         ,this.bizFire.takeUntilUserSignOut
      //     );
    }
  }

  removeHtml(text: string): string {
    return Commons.removeHtmlTag(text);
  }

  private reloadTitle(){

    if(this.chatBox == null){
      return;
    }

    this.chatTitle = this.chatBox.data.title || this.chatBox.data.name;

    if(this.chatTitle == null) {
      this.chatTitle = '';
      const chatUserUids = this.chatBox.data.memberArray.filter(uid => uid !== this.bizFire.uid);

      // if not, create title with user names.
      this.cacheService.resolvedUserList(chatUserUids, Commons.userInfoSorter)
        .subscribe((users :IUser[]) => {
          this.chatTitle = users.map(u => u.data.displayName).join(',');
          if(users.length === 0) {
            // no user left only me.
            // add no user
            this.chatTitle = 'No users';
          }
        });
    }
  }


  async makeChatIcon() {

    //uids : string[];
    // const uids = Object.keys(this.chatBox.data.members).filter(uid => uid !== this.bizFire.uid);
    const uids = this.chatBox.data.memberArray.filter(uid => uid !== this.bizFire.uid);

    for(const uid of uids) {
      if(this.chatIcon == null) {
        const userData = await this.cacheService.userGetObserver(uid).pipe(take(1)).toPromise();
        this.chatIcon = userData;
      } else {
        break;
      }
    }
    
    //대화상대가 모두 탈퇴하고 자신만 남으면 자신의 아이콘이라도 표시하기 위함.
    if(uids == null || uids.length === 0) {
      const userData = await this.cacheService.userGetObserver(this.bizFire.uid).pipe(take(1)).toPromise();
      this.chatIcon = userData;
    }

  }

  isImage(f: IFiles): boolean {
    return Commons.isImageFile(f);
  }

  // create notice message with current langPack
  makeNoticeMessage(){
    this.bizFire.onLang
        .pipe(take(1))
        .subscribe((l: any)=> {

          this.langPack = l.pack();
          const notice = this.chatBox.data.lastMessage.message.notice;

          if(notice.type === 'exit'){
            const uid = notice.uid;
            if(uid){
              this.cacheService.userGetObserver(uid[0]).subscribe((user: IUser) => {
                if(user){
                  const text = this.langPack['chat_exit_user_notice'].replace('$DISPLAYNAME', user.data.displayName);
                  this.noticeMessage$.next(text);
                } else {
                  console.error(`user [${uid[0]}] not fount.`);
                  this.noticeMessage$.next(`user exit chat`);
                }
              });
            }
          }

          if(notice.type === 'init'){
            const text = this.langPack['create_chat_room'];
            this.noticeMessage$.next(text);
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
            this.noticeMessage$.next(text);
          }

          if(notice.type === 'video'){
            const uid = notice.uid;
            // const vid = notice.vid;
            if(uid){
              this.cacheService.userGetObserver(uid[0]).subscribe((user: IUser) => {
                if(user){
                  const text = this.langPack['video_notice_msg'].replace('$DISPLAYNAME',user.data.displayName);
                  // console.log('text:', text);
                  this.noticeMessage$.next(text);
                }
                else {
                  console.error(`user [${uid[0]}] not fount.`);
                  this.noticeMessage$.next(`User created video chat`);
                }
              });
            }
          }
        });
  }

}
