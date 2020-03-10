import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {TakeUntil} from "../../biz-common/take-until";
import {IMessage, IMessageData} from '../../_models/message';
import {IBizGroup, IUser} from "../../_models";
import {Commons} from "../../biz-common/commons";
import {BizFireService} from '../../biz-fire/biz-fire';
import {CacheService} from '../../core/cache/cache';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {ITranslations, TranslateService} from '../../providers/translate.service';
import {ChatService} from '../../providers/chat.service';


@Component({
  selector: 'biz-message-balloon',
  templateUrl: './message-balloon.component.html',
  styleUrls: ['./message-balloon.component.scss'],
})
export class MessageBalloonComponent implements OnInit {

  @Input()
  set message(msg: IMessage){
    this._message = msg;
    if(this._message){
      this.loadMessage(this._message);
    }
  }

  get message(){
    return this._message;
  }

  @Output()
  initScrollBottomForTranslation = new EventEmitter<boolean>();

  @Output()
  messageReply = new EventEmitter<IMessageData>();

  private _message: IMessage;
  public displayName;
  public photoURL;
  public text: string;
  public shortName : string;
  currentUserData: IUser;

  isMyMessage = false;

  readCount: number; // read user
  readUsers: string[];

  private group : IBizGroup;

  //유저 정보에서 가져와야함.
  userTranslationsFlg: boolean = false;

  private _unsubscribeAll;

  constructor(
    private translateService: TranslateService,
    private bizFire : BizFireService,
    private chatService : ChatService,
    private cacheService : CacheService) {
    this._unsubscribeAll = new Subject<any>();
  }

  ngOnInit() {
    this.bizFire.currentUser.pipe(takeUntil(this._unsubscribeAll)).subscribe((user) => {
      this.userTranslationsFlg = user.autoTranslation;
    });
  }

  private loadMessage(message: IMessage) {

    this.group = this.bizFire.currentBizGroup;

    if(message.data.isNotice){
      // just show message and do nothing.
      return;
    }

    this.text = this.convertMessage(message);

    // async get user's info include me.
    const uid = this._message.data.sender;
    if(uid){
      // get photoURL
      this.isMyMessage = uid === this.bizFire.currentUID;

      this.cacheService.userGetObserver(uid)
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe( (user:IUser) =>{
          if(user){
            this.setUserInfo(user);
          } else {
            // user not found from Firestore.
            this.photoURL = null;
            this.shortName = 'U';
            this.displayName = 'unknown user';
          }
        });
    }

    /*
    * Get Unread Count.
    * 현재는 라인식 읽은이들 수
    * */
    this.calcUnreadCount();
  }



  private convertMessage(message: IMessage): string {

    let ret: string = '';
    if (message.data.message && message.data.message.text) {
      let text = message.data.message.text;

      ret = text;
    }
    return ret;
  }


  private setUserInfo(user: IUser){
    this.currentUserData = user;
    this.displayName = user.data.displayName || user.data.email || '';
  }

  private calcUnreadCount (){
    if(this.message && this.message.data.read){

      const readUserId = Object.keys(this.message.data.read)
        .filter(uid => this.message.data.sender!== uid)
        .filter(uid => this.message.data.read[uid].unread === false);

      if(readUserId.length > 0){
        this.cacheService.resolvedUserList(readUserId, Commons.userInfoSorter)
          .subscribe((list: IUser[]) => {
            this.readUsers = list.map(l => l.data.displayName);
            this.readCount = this.readUsers.length;
          });
      }
    }
  }

  // 말풍선 스타일 클레스네임 텍스트를 리턴.
  groupColorBalloon(): string {
    if(this.group.data.team_color) {
      return 'balloon-style-'+Commons.getGroupColorStyleName(this.group.data.team_color);
    } else {
      return 'balloon-style-duskblue';
    }
  }

  //번역이 되면 부모컴포넌트에 알려준다 -> 스크롤초기화를 위해서.
  finishTranslation(result){
    this.initScrollBottomForTranslation.emit(result);
  }

  getReplay(msg: IMessageData){
    this.messageReply.emit(msg);
  }

}
