
import { Injectable } from '@angular/core';

import {SquadService, ISquad, ISquadData} from './squad.service';
import {BehaviorSubject, Observable, of} from 'rxjs';
import * as firebase from 'firebase/app';
import {Commons, STRINGS} from '../biz-common/commons';

import {debounceTime, filter, takeUntil} from 'rxjs/operators';
import {IChat, IChatData, IFiles, IMessage, IMessageData} from "../_models/message";
import {IBizGroup, IUser} from '../_models';
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {BizFireService} from '../biz-fire/biz-fire';
import {Electron} from './electron';
import {LangService} from '../core/lang.service';
import {CacheService} from '../core/cache/cache';
import {environment} from '../../environments/environment';
import {ConfigService} from '../config.service';
import {IonContent} from '@ionic/angular';
import {IUnreadMap, UnreadCounter} from '../components/classes/unread-counter';
import {TakeUntil} from '../biz-common/take-until';
import {Chat} from '../biz-common/chat';
import {DocumentChangeAction} from '@angular/fire/firestore';

@Injectable({
    providedIn: 'root'
})

export class ChatService extends TakeUntil{

  var_chatRooms: any;

  // onChatRoomListChanged = new BehaviorSubject<IChat[]>(null);

  onSelectChatRoom = new BehaviorSubject<IChat>(null);

  fileUploadProgress = new BehaviorSubject<number>(null);

  langPack: any = {};

  private _chatList : IChat[];


  private chatDataMap: any = {
    chatListSub: null,
    chatListSubject: new BehaviorSubject<IChat[]>(null),
    chatList: null,

    squadChatListSub: null,
    squadChatSubject: new BehaviorSubject<IChat[]>(null),
    squadChatList: null
  };

  //CHAT CONTENT CACHE
  private chatContentMap = {};

  private currentGroupId: string;

  get unreadCountMap$(): Observable<IUnreadMap> {
    return this.unreadCounter.unreadChanged$.asObservable()
        .pipe(
            filter(d=>d!=null),
            debounceTime(800), // 0.8 sec
        );
  }

  get chatList$(): Observable<IChat[]>{
    if(this.chatDataMap == null){
      throw new Error('ChatService has not being initialized.');
    }
    return this.chatDataMap.chatListSubject.asObservable().pipe(filter(d=> d!= null));
  }

  get squadChatList$(): Observable<IChat[]>{
    if(this.chatDataMap == null){
      throw new Error('ChatService has not being initialized.');
    }
    return this.chatDataMap.squadChatSubject.asObservable().pipe(filter(d=> d!= null));
  }

  /***********************************************************/
  // 채팅방 로딩시 푸쉬 보낼 상대를 미리 읽어 놓는다.
  /***********************************************************/
  pushTargetUserIdList: string[];

  constructor(
      public bizFire : BizFireService,
      public electron: Electron,
      private langService : LangService,
      private http: HttpClient,
      private cacheService : CacheService,
      private configService: ConfigService,
      private unreadCounter: UnreadCounter) {
    super();

    this.langService.onLangMap
        .pipe(takeUntil(this.bizFire.onUserSignOut))
        .subscribe((l: any) => {
          this.langPack = l;
        });

    this.bizFire.onUserSignOut.subscribe(()=>{
      this.clear();
    });
    this.bizFire.onBizGroupChanged$.subscribe(()=> {
      console.log("onBizGroupChanged$.subscribe = clear unread count");
      console.log(this.unreadCounter);
      this.clear();
    });

    this.bizFire.onBizGroupSelected
    .subscribe((g: IBizGroup)=>{

      let load = true;
      if(this.currentGroupId){
        load = this.currentGroupId !== g.gid;
      }

      if(load){

        const gid = g.gid;

        console.log(`onBizGroupSelected: [${g.gid}],`);

        // delete old other gid's data.
        this.clear();

        // start monitor group chat
        this.loadChat(gid);
        // start monitor each squad's chat.
        this.loadSquadChat(gid);

        this.currentGroupId = gid;
      }


    });
  }

  loadChat(gid : string) {
    let startNewLoad = true;

    // clear old one if gid id differ
    if(this.currentGroupId != null){
      if(this.currentGroupId !== gid){
        // new group have selected.
        // delete old datas.
        this.clear();
        // load new sub
      } else {
        console.log('이전 채팅리스트를 재활용');
        // old one still usable
        startNewLoad = false;
      }
    }

    if(startNewLoad){

      // start load chatList
      const path = Commons.chatPath(gid);
      this.chatDataMap.chatList = [];

      this.chatDataMap.chatListSub = this.bizFire.afStore.collection(path, (ref:any)=> {
        let q: any = ref;
        q = q.where('status', '==', true);
        q = q.where(new firebase.firestore.FieldPath(STRINGS.FIELD.MEMBER, this.bizFire.uid), '==', true);
        return q;
      }).stateChanges()
          .pipe(
              this.takeUntil,
              takeUntil(this.bizFire.onUserSignOut),
          ).subscribe( (changes: any[]) => {

            changes.forEach((change: DocumentChangeAction<any>) => {
              this.processChange(change, this.chatDataMap.chatList, 'groupChat');
            }); // end of for

            this.chatDataMap.chatList.sort(Commons.sortDataByLastMessage());

            this.chatDataMap.chatListSubject.next(this.chatDataMap.chatList);
            this._chatList = this.chatDataMap.chatList;
          });

    }
  }

  loadSquadChat(gid : string) {
    let startNewLoad = true;

    // clear old one if gid id differ
    if(this.currentGroupId != null){
      if(this.currentGroupId !== gid){
        // new group have selected.
        // delete old datas.
        this.clear();
        // load new sub
      } else {
        console.log('이전 채팅리스트를 재활용');
        // old one still usable
        startNewLoad = false;
      }
    }
    if(startNewLoad === false){

      // do nothing.
      return;
    }
    const path = Commons.squadPath(gid);

    // save squad chat list here
    this.chatDataMap.squadChatList = [];

    // save unsubscribe
    this.chatDataMap.squadChatListSub =
    this.bizFire.afStore.collection(path, (ref:any) => {
      ref = ref.where('status', '==', true);
      if(this.bizFire.currentBizGroup.isGuest() === true){
        //파트너 그룹일때는 agile 스쿼드만 표시
        ref = ref.where('agile', '==', true);
      }
      return ref;
    })
        .stateChanges()
        .pipe(this.takeUntil, takeUntil(this.bizFire.onUserSignOut))
        .subscribe( (changes: any[]) => {
          // save new value
          changes.forEach(async (change, index) => {
            this.processChange(change, this.chatDataMap.squadChatList);
          });

          // sort by latest.
          this.chatDataMap.squadChatList.sort(Commons.sortDataByLastMessage());

          this.chatDataMap.squadChatSubject.next(this.chatDataMap.squadChatList);

        });
  }

  private processChange(change: any, chatList, chatType?: string){

    const data = change.payload.doc.data();
    const mid = change.payload.doc.id;

    if(change.type === 'added'){

      // add new message to top
      const item = new Chat(mid, data, this.bizFire.uid, change.payload.doc.ref);
      chatList.push(item);
      this.unreadCounter.register(mid, item);

    } else if (change.type === 'modified') {

      // replace old one
      for(let index = 0 ; index < chatList.length; index ++){
        if(chatList[index].cid === mid ){
          // find replacement

          //---------- 껌벅임 테스트 -------------//
          //chatList[index].data = data; // data 만 경신 한다.
          //-----------------------------------//
          const item = new Chat(mid, data, this.bizFire.uid, change.payload.doc.ref);
          chatList[index] = item;

          break;
        }
      }
    } else if (change.type === 'removed') {
      for (let index = 0; index < chatList.length; index++) {
        if (chatList[index].cid === mid) {
          // remove from array
          chatList.splice(index, 1);
          this.unreadCounter.unRegister(mid);
          break;
        }
      }
    }
  }

  getChatRooms(){

    let chatRooms = this._chatList;
    chatRooms.forEach(room =>{
      const newData = room;
      newData['uid'] = this.bizFire.uid;
    });
    return chatRooms;
  }

  createRoomByProfile(target: IUser) {
    const now = new Date();
    const newRoom:IChatData = {
      created:  now,
      gid: this.bizFire.gid,
      members: {
        [this.bizFire.uid] : true,
        [target.uid] : true
      },
      status: true,
      type: 'member'
    };

    this.createRoom(newRoom);
  }

  createRoomByFabs(isChecked) {

    console.log("newRoomnewRoom",isChecked);

    const now = new Date();
    const myValue = this.bizFire.currentUserValue;
    // fabs invite에서 초대 한 멤버가 한명일 경우 그룹채팅이 아니다.

    const newRoom:IChatData = {
      created:  now,
      gid: this.bizFire.gid,
      members : {
        [myValue.uid] : true
      },
      status: true,
      type: 'member'
    };
    if(isChecked.length > 0){
      isChecked.forEach(u => { newRoom.members[u.uid] = true; });
    }

    console.log("newRoomnewRoom",newRoom);
    this.createRoom(newRoom);
  }

  createRoom(newRoom:IChatData) {
    if(newRoom != null){
      this.bizFire.afStore.collection(Commons.chatPath(newRoom.gid)).add(newRoom).then(room => {
        room.get().then(snap =>{

          this.var_chatRooms = {
            cid : snap.id,
            data: snap.data(),
          } as IChat;
          this.makeRoomNoticeMessage('member-chat','init',newRoom.gid,snap.id)
              .then(() => {
                this.onSelectChatRoom.next(this.var_chatRooms);
                this.electron.openChatRoom(this.var_chatRooms);
              });
        })
      });
    }
  }

  getMessagePath(type,gid,id){
    switch(type){
      case 'member-chat':
        return Commons.chatMsgPath(gid,id);
      case 'squad-chat':
        return Commons.chatSquadMsgPath(gid,id);
      case 'member-chat-room':
        return Commons.chatDocPath(gid,id);
      case 'squad-chat-room':
        return Commons.chatSquadPath(gid,id);
    }
  }

  async addChatMessage(text: string, currentChat: IChat, files?: File[],reply? : IMessageData) {

    if(currentChat.ref == null) {
      console.error('addChatMessage', currentChat);
      throw new Error('currentChat.ref is null.');
    }

    const members = currentChat.isPublic() ? this.bizFire.currentBizGroup.data.members : currentChat.data.members;

    const msg = await this.addMessage(text,currentChat,members,files,true,reply);

    const pushTitle = `[${this.bizFire.currentBizGroup.data.team_name}] ${this.bizFire.currentUserValue.displayName}`;

    const pushData = { gid: currentChat.data.gid, cid: currentChat.cid, type: currentChat.data.type };

    pushData.type = pushData.type === 'member' ? STRINGS.GROUP_CHAT : STRINGS.SQUAD_CHAT;

    // 미리 로딩해 놓은 현재 채팅방 PUSH 수신 허용자들
    const targetUserList = this.pushTargetUserIdList;


    this.sendPush(targetUserList,pushTitle,this.convertMessage(text),pushData);

    return msg;
  }

  async addMessage(text: string,chat: IChat,unreadMembers : any,
                   files?: any[],saveLastMessage = true,replyMessage?:IMessageData) {
    try{
      if(chat.ref == null) {
        throw new Error('parentRef has no data.');
      }
      const membersUids = [];
      const now = new Date();

      console.log("채팅칠때 그룹gid 있나요.",this.bizFire.gid);

      const msg: IMessageData = {
        message: {
          text : text
        },
        gid: this.bizFire.gid,
        sender: this.bizFire.uid,
        created: now,
        isNotice : false,
        read : null,
        type : 'chat',
        file: false
      };

      if(chat.cid === STRINGS.SQUAD_CHAT) {
        msg.sid = chat.cid;
      }

      if(replyMessage){
        if(replyMessage.reply){
          delete replyMessage.reply;
        }
        msg.reply = replyMessage;
      }

      if(unreadMembers) {
        msg.read = Commons.makeReadFrom(unreadMembers, this.bizFire.uid);
        Object.keys(unreadMembers)
            .filter(uid => uid !== this.bizFire.uid)
            .forEach(uid => {
              membersUids.push(uid);
            })
      }

      const newChatRef = chat.ref.collection('chat').doc();

      if(files && files.length > 0) {
        msg.file = true;
        const storageChatPath = chat.ref.path;
        const mid = newChatRef.id;
        msg.message.files = [];
        const loads = files.map(async file => {
          const storagePath = `${storageChatPath}/chat/${mid}/${file.name}`;
          const storageRef = this.bizFire.afStorage.storage.ref(storagePath);
          const fileSnapshot = await storageRef.put(file);

          this.fileUploadProgress.next(fileSnapshot.bytesTransferred / fileSnapshot.totalBytes * 100);

          // get download url
          const downloadUrl = await fileSnapshot.ref.getDownloadURL();

          msg.message.files.push({
            name: file.name,
            size: file.size,
            type: file.type,
            url : downloadUrl,
            storagePath: storagePath
          } as IFiles)
        });
        await Promise.all(loads);
      }
      await newChatRef.set(msg);

      const newMessage = {mid: newChatRef.id, data: msg};

      // todo - 04.14 라스트 메시지 업데이트 부분 주석처리 (펑션으로 이동)
      // if(saveLastMessage){
      //   await parentRef.update({
      //     lastMessage: msg,
      //   });
      // }

      return newMessage;

    } catch (e) {
      console.log('addMessage',e,text);
      return null;
    }
  }

  makeRoomNoticeMessage(room_type,type,gid,cid,uid?) {

    const newMessage : IMessageData = {
      message: {
        notice: {
          type: type
        }
      },
      created: new Date(),
      isNotice: true,
      sender: this.bizFire.uid,
      type: 'chat'

    };

    if(uid){
      newMessage.message.notice.uid = uid;
    }
    return this.bizFire.afStore.firestore.collection(this.getMessagePath(room_type,gid,cid)).add(newMessage)
  }

  removeMember(uid,gid,cid) {
    return new Promise<void>( (resolve, reject) => {
      this.bizFire.afStore.firestore.doc(Commons.chatDocPath(gid,cid)).update({
        ['members.' + uid]: firebase.firestore.FieldValue.delete()
      }).then(()=>{
        // insert exit room message
        const text = this.langPack['chat_exit_user_notice'].replace('$DISPLAYNAME', this.bizFire.currentUserValue.displayName);
        this.makeRoomNoticeMessage('member-chat','exit',gid,cid,[this.bizFire.uid]).then(() => this.electron.windowClose());

        resolve();
      }).catch(error=>{
        reject(error);
      });
    });
  }

  async sendPush(targetUids: any[],pushTitle:any, msg:string, data: any){

    const payload = {
      notification: {
        title: pushTitle,
        body: msg,
        sound: 'default'
      },
      data: {
        cid: data.cid,
        type: data.type,
        gid: data.gid
      }
    };

    // const userWithPushAllowed = await this.getPushAllowedUserListFrom(data.gid, data.cid, targetUids);
    // console.log(userWithPushAllowed);

    const body = {
      usersUid: targetUids,
      payload: payload
    };

    //-----------------------------------------------//
    // send push
    //-----------------------------------------------//
    const path = `${this.bizFire.fireFunc}/sendFCM`;

    // push 결과는 async로 출력만 한다.
    this.http.post(path, body)
        .subscribe((result: any) => {
          console.log('sendPush result', result);

        }, (error1 => {
          console.error('sendPush error', error1);
        }));

    // push 결과를 기다리지 않고 종료.
    return true;
  }

  private async getPushAllowedUserListFrom(gid: string, cid: string, userList: string[]){
    const promises = userList.map(async uid => {
      const snap = await this.bizFire.afStore.doc(Commons.userDataPath(gid, uid)).get().toPromise();
      let ret = uid;
      if(snap.exists){
        const userData = snap.data();
        if(userData[cid] && userData[cid]['notify'] === false){
          //console.log(`${uid} 는 제외`);
          ret = null;
        }
      }
      // userData 가 없으면,
      // 일단 PUSH는 보낸다.
      return ret;
    });

    const userWithPushAllowed = await Promise.all(promises);
    return userWithPushAllowed.filter(uid => uid != null);
  }

  private convertMessage(text: string): string {
    let ret = '';
    if(text != null){
      ret = text ? String(text).replace(/<[^>]+>/gm, '') : '';
      if(ret.indexOf('\n') !== -1){
        // replace \n
        ret = text.split('\n').join('<br>');
      }
    }
    return ret;
  }

  // findChat(cid: string): IChat| null {
  //   let currentChat = this.onChatRoomListChanged.getValue().find(c => c.cid === cid);
  //   if(currentChat == null){
  //     currentChat = this.squadService.squadChatList$.getValue().find(c => c.cid === cid);
  //   }
  //   return currentChat;
  // }

  TimestampToDate(value) {
    //console.log(value, typeof value);
    if(value){
      if(typeof value === 'number'){
        // this is old date number
        return new Date(value * 1000);
      } else if(value.seconds != null &&  value.nanoseconds != null){
        const timestamp = new firebase.firestore.Timestamp(value.seconds, value.nanoseconds);
        return timestamp.toDate();
      } else {
        return value;
      }
    } else {
      return value;
    }
  }

  onNotification(name,msg) {
    Notification.requestPermission().then(() => {
      let myNotification = new Notification(name,{
        'body': msg,
      });
    })
  }

  /*
  * 채팅방이 바뀔때마다 PUSH 보낼 상대리스트를 미리 로딩해놓는다.
  * */
  async loadPushTargetList(currentChat: IChat){

    // push 대상자들. 제네럴 퍼블릭은 채팅방이 없으므로 제외되지만 사양변경시를 대비해 일단 구현.
    const targetUserList: string[] = currentChat.isPublic() === true ?
        this.bizFire.currentBizGroup.getMemberIdsExceptGuests(false) : currentChat.getMemberIds(false);

    const gid = this.bizFire.gid;
    const cid = currentChat.cid;
    const promises = targetUserList.map(async uid => {
      const snap = await this.bizFire.afStore.doc(Commons.userDataPath(gid, uid)).get().toPromise();
      let ret = uid;
      if(snap.exists){
        const userData = snap.data();
        if(userData[cid] && userData[cid]['notify'] === false){
          //console.log(`${uid} 는 제외`);
          ret = null;
        }
      }
      // userData 가 없으면,
      // 일단 PUSH는 보낸다.
      return ret;
    });

    let userWithPushAllowed = await Promise.all(promises);
    // null 인 상대에게는 PUSH 안보냄
    userWithPushAllowed = userWithPushAllowed.filter(uid => uid != null);
    console.log('userWithPushAllowed:', userWithPushAllowed);
    return userWithPushAllowed;
  }


  private clear(){

    //console.log('chat clear called !!!');

    //just unsubscribe old one.
    if(this.chatDataMap.chatListSub){
      this.chatDataMap.chatListSub.unsubscribe();
      this.chatDataMap.chatListSub = null;
      // left subject for next subscription.
    }

    if(this.chatDataMap.squadChatListSub){
      this.chatDataMap.squadChatListSub.unsubscribe();
      this.chatDataMap.squadChatListSub = null;
    }

    this.currentGroupId = null;


    if(this.unreadCounter){
      this.unreadCounter.clear();
    }
  }

}
