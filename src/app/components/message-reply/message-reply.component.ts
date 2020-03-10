import {Component, Input, OnInit} from '@angular/core';
import {TakeUntil} from '../../biz-common/take-until';
import {IMessageData} from '../../_models/message';
import {IUser, IUserData} from '../../_models';
import {BizFireService} from '../../biz-fire/biz-fire';
import {CacheService} from '../../core/cache/cache';

@Component({
  selector: 'biz-message-reply',
  templateUrl: './message-reply.component.html',
  styleUrls: ['./message-reply.component.scss']
})

export class MessageReplyComponent extends TakeUntil implements OnInit {

  @Input()
  set message(msg: IMessageData){
    this._message = msg;
    if(this._message){
      this.loadMessage(this._message);
    }
  }

  @Input()
  bgColor : string;

  get message(){
    return this._message;
  }

  private _message: IMessageData;
  text: string;

  toData : IUserData;

  constructor(private bizFire : BizFireService,
              private cacheService : CacheService) {
    super();
  }

  ngOnInit() {
  }

  private loadMessage(message: IMessageData) {

    this.text = this.convertMessage(message);

    const uid = message.sender;

    if(uid){
      // get photoURL
      const isMyMessage = uid === this.bizFire.currentUID;

      if(isMyMessage) {
        this.toData = this.bizFire.currentUserValue;
      } else {
        this.cacheService.userGetObserver(uid)
          .pipe(this.takeUntil)
          .subscribe( (user:IUser) =>{
            if(user){
              this.toData = user.data;
            }
          });
      }
    }
  }

  private convertMessage(message: IMessageData): string {

    let ret: string = '';
    if (message.message && message.message.text) {
      let text = message.message.text;

      ret = text;
    }
    return ret;
  }
}
