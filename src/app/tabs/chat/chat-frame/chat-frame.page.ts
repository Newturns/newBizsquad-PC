import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {ConfigService} from '../../../config.service';
import {BizFireService} from '../../../biz-fire/biz-fire';
import {ActivatedRoute} from '@angular/router';
import {IBizGroup, IUserData} from '../../../_models';
import {debounceTime, filter, take} from 'rxjs/operators';
import {IChat, IMessage, IMessageData, MessageBuilder} from '../../../_models/message';
import {Electron} from '../../../providers/electron';
import {Commons} from '../../../biz-common/commons';
import {Chat} from '../../../biz-common/chat';
import {ChatService} from '../../../providers/chat.service';
import {LoadingProvider} from '../../../providers/loading';
import {Subject, timer} from 'rxjs';
import {DocumentChangeAction} from '@angular/fire/firestore';
import {ToastProvider} from '../../../providers/toast';
import {IonContent} from '@ionic/angular';
import {formatDate} from '@angular/common';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {CacheService} from '../../../core/cache/cache';

@Component({
  selector: 'app-chat-frame',
  templateUrl: './chat-frame.page.html',
  styleUrls: ['./chat-frame.page.scss'],
})
export class ChatFramePage implements OnInit {

  // 스크롤 컨텐츠
  @ViewChild('scrollContent',{static: true}) contentArea: IonContent;

  //ion text-area
  @ViewChild('msgInput',{static: true}) msgInput: ElementRef;

  langPack = {};

  private gid :string;
  private cid : string;
  private type : string;

  private user : IUserData;

  private selectBizGroup : IBizGroup;

  public chatRoom : IChat;

  //메세지 배열
  public chatContent : IMessage[] = [];

  //read, Unread
  private addedMessages$ = new Subject<any>();
  private addedMessages: IMessage[];

  // 메세지 + 사진이 전부 로딩될때까지 컨텐츠내용 숨김.
  public showContent : boolean;

  // 지난메세지(moreMessage) 불러올때 기준이되는 값
  private start : any;
  private end : any;

  // 채팅 input
  chatForm : FormGroup;
  //메세지 개수 초과 에러 텍스트
  private maxChatLength = 1000;
  public chatLengthError: string;

  //max file size
  maxFileSize = 20000000; // max file size = 20mb;

  //스크롤컨텐츠를 포함한 전체 높이.
  private scrollHeight = 0;
  //스크롤이 늘어나기전 높이
  private oldHeight = 0;

  //스크롤이 가장 밑일 때 입력창을 누르면 스크롤을 맨 밑으로 보낸다.
  bottomCheck = false;
  // true if ion-content scrolled more than 100px
  private scrolled = false;

  private startToast = false;

  //프로그래스바
  loadProgress : number = 0;

  replyMessage : IMessageData;

  constructor(private configService : ConfigService,
              private activatedRoute: ActivatedRoute,
              private electronService: Electron,
              private chatService : ChatService,
              private loading: LoadingProvider,
              private toastProvider : ToastProvider,
              private fb: FormBuilder,
              private cacheService : CacheService,
              private bizFire : BizFireService) {

    this.chatForm = fb.group(
        {
          'chat': ['', Validators.compose([
            Validators.required,
            Validators.maxLength(this.maxChatLength),
            Validators.minLength(1)
          ])]
        }
    );
    this.chatForm.get('chat').valueChanges
    .pipe(debounceTime(300))
    .subscribe((value: string) => {
      value = value.trim();
      //console.log(value);
      if(value.length > this.maxChatLength){
        this.chatLengthError = `${this.langPack['longText']} (${value.length}/${this.maxChatLength})`;
      } else {
        this.chatLengthError = null;
      }
    });

  }

  ngOnInit() {
    this.gid = this.activatedRoute.snapshot.queryParamMap.get('gid');
    this.cid = this.activatedRoute.snapshot.queryParamMap.get('cid');
    this.type = this.activatedRoute.snapshot.queryParamMap.get('type');

    this.getMessages(this.gid,this.cid,this.type);

    //파일 업로드 프로그레스바
    this.chatService.fileUploadProgress.subscribe(per => {
      if(per === 100) {

        // 용량이 작을때 프로그레스 바가 안나오므로..
        this.loadProgress = per;

        // 1.5초 뒤 값을 초기화한다.
        timer(1500).subscribe(() => {
          this.chatService.fileUploadProgress.next(null);
          this.loadProgress = 0;
          this.contentArea.scrollToBottom(0);
        })
      } else {
        this.loadProgress = per;
      }
      console.log(per);
    });

    this.bizFire.currentUser.subscribe((user: IUserData) => {
      if(user) {
        //한번만 실행.
        if(this.user == null) {
          this.user = user;
          this.bizFire.onLang.subscribe((l: any) => this.langPack = l.pack());
          this.onWindowChat(this.gid,this.cid,this.type);
        }
      }
    });

    this.bizFire.onBizGroupSelected.subscribe((group : IBizGroup) => {
      if(group.data.members[this.bizFire.uid] === true && group.data.status === true) {
        this.selectBizGroup = group;
        //채팅방 멤버이면서, 상태값이 트루일 경우.
        //  ..
      } else {
        this.electronService.windowClose();
      }
    });


    //메세지 읽음,안읽음 처리
    this.addedMessages$
    .pipe(debounceTime(1000))
    .subscribe(async () => {

      try {

        if (this.addedMessages) {

          let batch = this.bizFire.afStore.firestore.batch();
          let batchAdded = 0;// filter my unread messages.

          const unreadList = this.addedMessages.filter((l: IMessage) =>
              l.data.isNotice !== true &&
              (l.data.read == null
                  || l.data.read[this.bizFire.uid] == null
                  || l.data.read[this.bizFire.uid].unread === true)
          );

          // add batch
          for(let m of unreadList){
            const read = {[this.bizFire.uid]: {unread: false, read: new Date()}};
            batch.set(m.ref, {read: read}, {merge: true});
            batchAdded++;
            // upload memory
            // 지울경우 효과는?
            m.data.read = read;
            if(batchAdded > 400){
              //
              console.log(`commit to read ${batchAdded} chats...`);
              await batch.commit();
              batch = this.bizFire.afStore.firestore.batch();
              batchAdded = 0;
            }
          }

          if(batchAdded > 0){
            console.log(`commit to read ${batchAdded} chats...`);
            await batch.commit();
          }
        }

      } catch (e) {
        console.error(e);
      } finally {
        // clear processed messages
        this.addedMessages = [];
      }

    });

    //푸시 대상 데이터 가져오기.
    this.chatService.onSelectChatRoom
        .pipe(
            filter(c => c != null)
            ,take(1)
        )
        .subscribe((chat : IChat) => {
          console.log("푸시 대상 데이터 가져오기.");
          console.log(chat);
          this.chatService.loadPushTargetList(chat)
          .then( (userWithPushAllowed: string[])=> this.chatService.pushTargetUserIdList = userWithPushAllowed);
    });
  }

  async onWindowChat(gid:string,cid:string,type:string) {
    try{
      await this.bizFire.loadBizGroup(gid);

      await this.chatDataLoad(gid,cid,type);

    } catch (e) {
      this.electronService.windowClose();
    }
  }

  file(file){
    if(file.target.files.length === 0 ){
      return;
    }
    const maxFileSize = this.selectBizGroup.data.maxFileSize == null ? this.maxFileSize : this.selectBizGroup.data.maxFileSize;

    if(file.target.files[0].size > maxFileSize){
      this.electronService.showErrorMessages("Failed to send file.","sending files larger than 10mb.");
    } else {
      const attachedFile  = file.target.files[0];
      const converterText = Commons.chatInputConverter(attachedFile.name);

      this.chatService.addChatMessage(converterText,this.chatRoom,[attachedFile]).then(() => {
        timer(800).subscribe(() => {
          // call ion-content func
          this.contentArea.scrollToBottom(0);
        });
      });
    }
  }

  keydown(e : any) {
    if (e.keyCode == 13) {
      if (e.shiftKey === false) {
        // prevent default behavior
        e.preventDefault();
        // call submit
        let value = e.target.value;
        value = value.trim();
        if(value.length > 0){
          this.sendMsg(value,e);
        }
      }
    }
  }

  protected adjustTextarea(event: any): void {
    let textarea: any = event.target;
    textarea.style.overflow = 'hidden';
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
    return;
  }

  sendMsg(value : any,e? : any) {
    let valid = this.chatForm.valid;

    if(valid) {
      const text = Commons.chatInputConverter(value);

      if(text.length > 0) {
        this.chatService.addChatMessage(text,this.chatRoom,null,this.replyMessage).then(() => {
          timer(0).subscribe(() => {
            this.replyMessage = null;
            this.contentArea.scrollToBottom(0);
          });
        });
        this.chatForm.setValue({chat:''});
        //textarea 높이 초기화를 위한 이벤트 전달.
        this.adjustTextarea(e);
      }
    }
  }

  async chatDataLoad(gid: string,cid:string,type:string) {
    const RoomPath = type === 'member' ?
        Commons.chatDocPath(gid,cid) : Commons.chatSquadPath(gid,cid);
    // 채팅방 정보 갱신. (초대,나가기)
    await this.bizFire.afStore.doc(RoomPath)
        .snapshotChanges().subscribe((snap : any) => {
          if(snap.payload.exists) {
            this.chatRoom = new Chat(snap.payload.id,snap.payload.data(),this.bizFire.uid,snap.payload.ref);

            this.chatService.onSelectChatRoom.next(this.chatRoom);
          }
        });
  }

  async getMessages(gid: string,cid:string,type:string) {
    const msgPath = type === 'member' ?
        Commons.chatMsgPath(gid,cid) :
        Commons.chatSquadMsgPath(gid,cid);

    await this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created','desc').limit(20))
        .get().subscribe(async (snapshots) => {
          if(snapshots && snapshots.docs) {
            this.start = snapshots.docs[snapshots.docs.length - 1];

            console.log("startstartstart!!!",this.start);

            await this.getNewMessages(msgPath, this.start);

            const loading = await this.loading.show();

            timer(2500).subscribe(async () => {
              // call ion-content func
              this.showContent = true;
              this.contentArea.scrollToBottom(0);
              await loading.dismiss();
            });
          }
        })
  }

  getNewMessages(msgPath,start) {
    this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created')
        .startAt(start))
        .stateChanges()
        .pipe(filter(snaps => snaps && snaps.length > 0))
        .subscribe((changes : DocumentChangeAction<any>[]) => {

          const list: IMessage[] = changes.filter(c => c.type === 'added').map(c => MessageBuilder.buildFromSnapshot(c));
          const modified: IMessage[] = changes.filter(c => c.type === 'modified').map(c => MessageBuilder.buildFromSnapshot(c));
          const removed: IMessage[] = changes.filter(c => c.type === 'removed').map(c => MessageBuilder.buildFromSnapshot(c));

          if(list.length > 0){
            list.forEach((l) => {
              this.chatContent.push(l);
              if(!this.bottomCheck && l.data.sender !== this.bizFire.uid && this.startToast) {
                this.toastProvider.showToast(this.langPack['new_message'],'top');
              }
            });
            this.addAddedMessages(list.filter(m => m.data.sender !== this.bizFire.uid));
          }

          if(modified.length > 0){
            let replaced = 0;
            modified.forEach(m => {
              const index = this.chatContent.findIndex(c => c.mid === m.mid);
              if(index !== -1){
                // this.chatContent[index].data = m.data;
                this.chatContent[index] = m;
                //console.log(m.mid, m.data.message.text, 'replaced');
                replaced ++;
              }
            });
          }

          if(removed.length > 0){
            // 채팅 메시지가 지워짐.
            removed.forEach(m => {
              const index = this.chatContent.findIndex(c => c.mid === m.mid);
              this.chatContent.splice(index, 1);
            });
          }

          if(this.bottomCheck) {
            timer(100).subscribe(() => {
              // call ion-content func
              this.contentArea.scrollToBottom(0);
              this.startToast = true;
            });
          }
          console.log(this.contentArea.ionScrollEnd)
        });
  }

  getMoreMessages() {

    const msgPath = this.type === 'member' ?
        Commons.chatMsgPath(this.gid,this.cid) :
        Commons.chatSquadMsgPath(this.gid,this.cid);

    this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created','desc')
        .startAt(this.start).limit(20)).get()
        .subscribe((snapshots) => {
          this.end = this.start;
          this.start = snapshots.docs[snapshots.docs.length - 1];

          this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created')
              .startAt(this.start).endBefore(this.end))
              .stateChanges()
              .pipe(filter(snaps => snaps && snaps.length > 0))
              .subscribe((changes : DocumentChangeAction<any>[]) => {

                const list: IMessage[] = changes.filter(c => c.type === 'added').map(c => MessageBuilder.buildFromSnapshot(c));
                const modified: IMessage[] = changes.filter(c => c.type === 'modified').map(c => MessageBuilder.buildFromSnapshot(c));
                const removed: IMessage[] = changes.filter(c => c.type === 'removed').map(c => MessageBuilder.buildFromSnapshot(c));

                if(list.length > 0){
                  this.addAddedMessages(list.filter(m => m.data.sender !== this.bizFire.uid));
                  this.chatContent = list.concat(this.chatContent);
                }

                if(modified.length > 0){
                  let replaced = 0;
                  modified.forEach(m => {
                    const index = this.chatContent.findIndex(c => c.mid === m.mid);
                    if(index !== -1){
                      // this.chatContent[index].data = m.data;
                      this.chatContent[index] = m;
                      //console.log(m.mid, m.data.message.text, 'replaced');
                      replaced ++;
                    }
                  });
                }

                if(removed.length > 0){
                  // 채팅 메시지가 지워짐.
                  removed.forEach(m => {
                    const index = this.chatContent.findIndex(c => c.mid === m.mid);
                    this.chatContent.splice(index, 1);
                  });
                }



                timer(100).subscribe(() => {
                  this.contentArea.getScrollElement().then(el => {
                    this.contentArea.scrollToPoint(0,el.scrollHeight - this.oldHeight);
                  });
                });

              });
        })
  }

  scrollHandler(e) {
    this.contentArea.getScrollElement().then(el => {
      const top = el.scrollTop; // 스크롤 현재 top
      const height = el.scrollHeight; // 내부적 전체 높이
      const offset = el.offsetHeight; // 외부에 보이는 높이.

      //소수점인경우 소수첫째자리에서 반올림
      this.bottomCheck = Number(top.toFixed(0))+offset === height;

      // 100px 보다 크면 스크롤 판정.
      this.scrolled = height - (offset + top) > 100;
      // console.log('top:', top, 'height', height, 'offset', offset, this.scrolled);

      if(el.scrollTop === 0) {
        this.getMoreMessages();
        this.oldHeight = el.scrollHeight;
      }
    });
  }


  // read , unread
  private addAddedMessages(list: IMessage[]){
    if(this.addedMessages == null){
      this.addedMessages = [];
    }
    const unreadList = list.filter((l:IMessage) =>
        l.data.isNotice === false && (l.data.read == null
        || l.data.read[this.bizFire.uid] == null
        || l.data.read[this.bizFire.uid].unread === true)
    );

    this.addedMessages = this.addedMessages.concat(unreadList);
    if(this.addedMessages.length > 0){
      timer(0).subscribe(()=> this.addedMessages$.next());
    }
  }


  isDifferentDay(messageIndex : number) {
    if (messageIndex === 0) return true;

    const d1 = new Date(this.chatContent[messageIndex - 1].data.created.toDate());
    const d2 = new Date(this.chatContent[messageIndex].data.created.toDate());

    return (
        d1.getFullYear() !== d2.getFullYear() ||
        d1.getMonth() !== d2.getMonth() ||
        d1.getDate() !== d2.getDate()
    )
  }

  getMessageDate(messageIndex: number): string {
    const dateToday = new Date().toDateString();
    const longDateYesterday = new Date();
    longDateYesterday.setDate(new Date().getDate() - 1);
    const dateYesterday = longDateYesterday.toDateString();
    const today = dateToday.slice(0, dateToday.length - 5);
    const yesterday = dateYesterday.slice(0, dateToday.length - 5);

    const wholeDate = new Date(
        this.chatContent[messageIndex].data.created.toDate()
    ).toDateString();

    const messageDateString = wholeDate.slice(0, wholeDate.length - 5);

    if (
        new Date(this.chatContent[messageIndex].data.created.toDate()).getFullYear() ===
        new Date().getFullYear()
    ) {
      if (messageDateString === today) {
        return this.langPack['today'];
      } else if (messageDateString === yesterday) {
        return this.langPack['yesterday'];
      } else {
        return formatDate(this.chatContent[messageIndex].data.created.toDate(),
            `EEE d MMMM',' y`,
            'en');
      }
    } else {
      return wholeDate;
    }

  }

  translationResult(result) {
    if(result && this.bottomCheck) {
      setTimeout(() => {
        this.contentArea.scrollToBottom(0);
      }, 100);
    }
  }

  removeHtml(text: string): string {
    return Commons.removeHtmlTag(text);
  }

  removeReplyInfo(){
    this.replyMessage = null;
  }

  onFileDropped(e) {
    console.log("start drop!!",e);
  }
}
