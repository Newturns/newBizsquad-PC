import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {map} from 'rxjs/operators';
import {DocumentChangeAction} from '@angular/fire/firestore';
import {IChat, IMessageData} from "../../_models/message";
import {TakeUntil} from "../../biz-common/take-until";
import {BehaviorSubject, Subscription} from "rxjs";
import {Commons} from "../../biz-common/commons";
import {BizFireService} from '../../biz-fire/biz-fire';


@Component({
  selector: 'biz-last-message',
  templateUrl: './last-message.component.html',
})

export class LastMessageComponent extends TakeUntil implements OnInit {

  //임시
  @Input()
  useLastMessage = true;

  @Input()
  get room(): IChat {
    return this._room;
  }

  @Output()
  updated = new EventEmitter<IMessageData>();

  set room(value: IChat) {
    if(value.ref){
      this._room = value;
      this.reloadMessage();
    } else {
      console.error('LastMessageComponent: room must have ref.');
    }
  }

  private _room: IChat;

  private lastMessageSub: Subscription;

  //last Message observer
  lastMessage$ = new BehaviorSubject<any>(null);
  constructor(private bizFire: BizFireService) {
    super();
  }

  ngOnInit() {
    // start last message observe.
  }

  private reloadMessage(){

    if(this.room && this.room.ref){

      // 실시간 조회
      if(this.useLastMessage === false){
        if(this.lastMessageSub == null){
          this.lastMessageSub = this.bizFire.afStore.doc(this.room.ref.path).collection('chat', (ref: any) =>{
            ref = ref.orderBy('created', 'desc');
            ref = ref.limit(1);
            return ref;
          }).snapshotChanges()
            .pipe(
              this.takeUntil,
              this.bizFire.takeUntilUserSignOut,
              map((changes: DocumentChangeAction<any>[]) => {
                let data: IMessageData;
                if(changes && changes.length > 0 ){
                  data = changes[0].payload.doc.data() as IMessageData;
                }
                return data;
              })
            ).subscribe((data: IMessageData) => {
              // show html
              this.lastMessage$.next(data);
            });
        }

      } else {

        //db lastMessage 사용.
        if(this.room.data.lastMessage){
          this.lastMessage$.next(this.room.data.lastMessage);
        } else {
          this.bizFire.afStore.doc(this.room.ref.path).collection('chat', (ref: any) =>{
            ref = ref.orderBy('created', 'desc');
            ref = ref.limit(1);
            return ref;
          }).get().subscribe( snap => {
            if(!snap.empty){
              const lastMessage = snap.docs[0].data() as any;
              this.room.data.lastMessage = lastMessage;
              this.room.ref.update({
                lastMessage: lastMessage
              });
              this.lastMessage$.next(lastMessage);
            }
          });
        }
      }

    }
  }

  removeHtml(text: string): string {
    return Commons.removeHtmlTag(text);
  }

}
