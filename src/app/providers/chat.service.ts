
import { Injectable } from '@angular/core';

import {SquadService, ISquad, ISquadData} from './squad.service';
import {BehaviorSubject, Observable, of} from 'rxjs';
import * as firebase from 'firebase';
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
            filter(d=>d!=null)// 0.5 sec
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
    this.bizFire.onBizGroupChanged$.subscribe(()=> this.clear());

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

            this.chatDataMap.chatList.sort(Commons.sortDataByLastMessage(false));

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
      return ref;
    })
        .stateChanges()
        .pipe(this.takeUntil, takeUntil(this.bizFire.onUserSignOut))
        .subscribe( (changes: any[]) => {
          // save new value
          changes.filter(change => {

            const data: ISquadData = change.payload.doc.data();
            // type 이 public 인건 제네럴스쿼드의 public스쿼드 밖에 없다.
            // type 이 private 이면, 제네럴/ 애자일 관계없이 내가 속한 스쿼드만 보면된다.
            // agile squad must include me.
            return data.members[this.bizFire.uid] === true;
          })
              .forEach(async (change, index) => {

                this.processChange(change, this.chatDataMap.squadChatList);
              });

          // sort by latest.
          this.chatDataMap.squadChatList.sort(Commons.sortDataByLastMessage(false));

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

  async addChatMessage(text: string, currentChat: IChat, files?: File[]) {

    if(currentChat.ref == null) {
      console.error('addChatMessage', currentChat);
      throw new Error('currentChat.ref is null.');
    }

    const members = currentChat.isPublic() ? this.bizFire.currentBizGroup.data.members : currentChat.data.members;

    const msg = await this.addMessage(text,currentChat.ref,members,files);

    const pushTitle = `[${this.bizFire.currentBizGroup.data.team_name}] ${this.bizFire.currentUserValue.displayName}`;
    const pushData = { cid: currentChat.cid, type: currentChat.data.type, gid: currentChat.data.gid };
    pushData.type = pushData.type === 'member' ? STRINGS.GROUP_CHAT : STRINGS.SQUAD_CHAT;
    console.log("pushDatapushData",pushData);

    this.sendPush(Commons.memberUID(members),pushTitle,this.convertMessage(text),pushData);

    return msg;
  }

  async addMessage(text: string,parentRef: any,unreadMembers : any,
                   files?: any[],saveLastMessage = true) {
    try{
      if(parentRef == null) {
        throw new Error('parentRef has no data.');
      }
      const membersUids = [];
      const now = new Date();
      const msg: IMessageData = {
        message: {
          text : text
        },
        sender: this.bizFire.uid,
        created: now,
        isNotice : false,
        read : null,
        type : 'chat',
        file: false
      };

      if(unreadMembers) {
        msg.read = Commons.makeReadFrom(unreadMembers, this.bizFire.uid);
        Object.keys(unreadMembers)
            .filter(uid => uid !== this.bizFire.uid)
            .forEach(uid => {
              membersUids.push(uid);
            })
      }

      const newChatRef = parentRef.collection('chat').doc();

      if(files && files.length > 0) {
        msg.file = true;
        const storageChatPath = parentRef.path;
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

      if(saveLastMessage){
        await parentRef.update({
          lastMessage: msg,
        });
      }
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
      },
      data: {
        cid: data.cid,
        type: data.type,
        gid: data.gid
      }
    };

    const userWithPushAllowed = await this.getPushAllowedUserListFrom(data.gid, data.cid, targetUids);
    console.log(userWithPushAllowed);

    const body = {
      usersUid: userWithPushAllowed,
      payload: payload
    };

    //-----------------------------------------------//
    // send push
    //-----------------------------------------------//
    const path = `${environment.bizServerUri}/sendFCM`;

    const headers = {
      headers: new HttpHeaders({
        'authorization': this.bizFire.uid
      })
    };

    this.http.post(path, body, headers)
        .subscribe((result: any) => {
          console.log("resultresult",result);
        },(error => {
          console.error("sendPush error",error);
        }));

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
