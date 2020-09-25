import {Inject, Injectable, InjectionToken, Optional} from '@angular/core';
import {BehaviorSubject, Observable, Subject, Subscription, zip} from 'rxjs';
import {filter, map, take, takeUntil} from 'rxjs/operators';
import * as firebase from 'firebase/app';
import {Commons, STRINGS} from '../biz-common/commons';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {DocumentChangeAction} from '@angular/fire/firestore';
import {DocumentSnapshot, IBizGroup, IBizGroupData, IFirestoreDoc, IMetaData, IUser} from '../_models';
import {BizFireService} from '../biz-fire/biz-fire';
import {CacheService} from './cache/cache';
import {BizGroupBuilder} from '../biz-fire/biz-group';

// export const NOTIFICATION_SERVICE = new InjectionToken<string>('notificationInfo');

export interface INotificationItem extends INotification {
  html?: {
    header: string[],
    content: string[],
    link?:string[],
    user?: IUser,
    expanded?: boolean
  }
}

export interface IAlarmConfig {

  /* 필수 항목들 */
  // on?: boolean,

  groupInvite: boolean,
  //squadInvite: boolean, // 스쿼드는 초대 개념이 아님. 단톡방에는 초대받고 들어가지 않음.
  bbs: boolean,
  post: boolean,
  groupInOut?: boolean, // 그룹에 조인했을때 같은 그룹 사용자들에게 알람.
  chat?: boolean,


  /* 다음 버전 */
  comment?: boolean,//다음버전?
  schedule?: boolean, // 다음버전
  version?: string,
  squadInOut?: boolean, // 스쿼드에 참가 이벤트는 있을 필요가 없다.
  /* VIDEO CHAT INVITE*/
  video?: boolean

}


export interface INotification extends IFirestoreDoc{
  mid: string,
  data: INotificationData,
}

//export type NotificationType = 'invitation' | 'notify' | 'reply';
//export type NotificationSubType = 'post'|'comment'| 'join'| 'exit'| 'delete'|'group'|'squad';
//export type InvitationType = 'group'|'squad';
export type NotificationType = 'post' | 'bbs' | 'comment' | 'schedule' | 'video'| 'groupInvite' | 'task' | 'calendar';

export interface INotificationData extends IAlarmConfig{

  from: string, // uid
  to?: string, // uid
  gid: string,
  sid?: string,
  type: NotificationType, //IAlarmConfig 값으로 수정. (알람종류 확장시 대응)
  info?: NotificationInfo,
  created: any,
  statusInfo: {done: boolean},

  // added. force send alarm option to server
  forceAlarm?: boolean,
  // server will send push automatically.
  // set to false to stop that.
  // 서버는 push 를 자동으로 보낸다.
  skipPushToMobile?: boolean,
  deviceTokens: any

}

export interface NotificationInfo {
  type?: string,
  sid?: string,
  mid?: string,
  title?: string,
  path?: string,
  cid?: string,
  vid?: string,
  data?: any // custom data,
  // custom push용 데이터
  // 설정할 경우, 서버는 payload.notification 에 아래값을 설정한다.
  push?: {
    title: string, // [Bizsquad] 등 타이틀
    body: string // 본문 한줄.
  }
  auth?: string,
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  // for notice component.
  private _onNotifications = new BehaviorSubject<INotification[]>(null);
  get onNotifications(): Observable<INotification[]>{
    return this._onNotifications.asObservable().pipe(filter(n => n!=null));
  }

  // just next only unread messages.
  get onUnreadNotifications(): Observable<INotification[]> {
    return this._onNotifications.asObservable()
      .pipe(
        filter(n => n!= null),
        map(m => m.filter((n: INotification)=> {
          return n.data.statusInfo == null || n.data.statusInfo.done !== true;
        }))
        );

  }
  // alarm send by SettingComponent
  onAlarmChanged = new BehaviorSubject<IAlarmConfig>(null);

  // html converted data list.
  notificationItems: INotificationItem[];

  private notifySub: Subscription;

  private langPack = {};

  constructor(
    private bizFire: BizFireService,
    private cacheService: CacheService,
    private http: HttpClient) {


    this.bizFire.onLang.subscribe((l: any) => this.langPack = l.pack());

    // delete all notifications
    this.bizFire.onUserSignOut.subscribe(()=>{

      //this.onUnfinishedNotices.next([]);
      this._onNotifications.next(null);

      if(this.notifySub){
        this.notifySub.unsubscribe();
        this.notifySub = null;
      }

      if(this.notificationItems){
        this.notificationItems = null;
      }

    });

    // allTime alarm monitor.
    this.bizFire.currentUser.subscribe(user => {

      // start new alarm ONLY first time.
      if(this.notifySub == null){
        this.loadNotification();
      }

      // find alarm from /user/<>.alarm
      let alarm: IAlarmConfig = user.alarm;

      if(alarm == null){
  
        /*
        * 디폴트는 그룹 초대 메시지, 채팅 알람.
        * */
        alarm = {
          groupInvite: true,
          groupInOut: false,
          post: false,
          bbs: false,
          chat: true
        };

        // and update firebase
        this.updateAlarmStatus(alarm);

      } else {
        // alarm info changed.
        this.onAlarmChanged.next(alarm);
      }

    });

  }

  /*private async processChange(change: any){

    const data = change.payload.doc.data();
    const mid = change.payload.doc.id;

    if(change.type === 'added'){

      // add new message to top
      let item = {mid: mid, data: data} as INotification;
      item = await this.makeHtml(item);

      this.notificationItems.push(item);

    } else if (change.type === 'modified') {

      // replace old one
      for(let index = 0 ; index < this.notificationItems.length; index ++){
        if(this.notificationItems[index].mid === mid ){
          // find replacement
          let item = {mid: mid, data: data} as INotification;
          item = await this.makeHtml(item);
          const oldExpanded = this.notificationItems[index].html.expanded;
          this.notificationItems[index] = item;
          this.notificationItems[index].html.expanded = oldExpanded;
          break;
        }
      }
    } else if (change.type === 'removed') {
      for (let index = 0; index < this.notificationItems.length; index++) {
        if (this.notificationItems[index].mid === mid) {
          // remove from array
          this.notificationItems.splice(index, 1);
          break;
        }
      }
    }
  }*/
  
  
  
  /*
  * reload all data always.
  * */
  loadNotification(){
    
    // reset old datas.
    if(this.notifySub){
      this.notifySub.unsubscribe();
      this.notifySub = null;
    }
  
    // empty cache
    this._onNotifications.next(null);
    
    // empty array
    this.notificationItems = [];
  
    this.notifySub = this.bizFire.afStore.collection(Commons.notificationPath(this.bizFire.uid),
      ref => ref.orderBy('created', 'desc')).stateChanges()
      .pipe(
        takeUntil(this.bizFire.onUserSignOut),
      )
      .subscribe(async (changes:DocumentChangeAction<any>[]) => {

        // save new value
        changes.forEach( (change: DocumentChangeAction<any>) => {

          Commons.processChange(change, this.notificationItems, 'mid', (c: any)=>{
            const item = {mid: c.payload.doc.id, data: c.payload.doc.data(), ref: c.payload.doc.ref} as INotification;
            //----------- 호환성 유지 -----------------//
            if(item.data.type == null){
              if(item.data.bbs === true){
                item.data.type = 'bbs';
              }
              if(item.data.post === true){
                item.data.type = 'post';
              }
              if(item.data.groupInvite === true){
                item.data.type = 'groupInvite';
              }
              if(item.data.video === true){
                item.data.type = 'video';
              }
              if(item.data.comment === true){
                item.data.type = 'comment';
              }
            }
            //----------- 호환성 유지 -----------------//
            return item;
          }, null, false);

        });// end of forEach
  
        //날짜순 재정렬 -> 없으면 새로운 알람이 왔을 때 새로운 알람이 리스트 아래에 추가돼있음
        this.notificationItems.sort((val1, val2)=> {
          return (val2.data.created).toMillis() - (val1.data.created).toMillis();
        });
        this._onNotifications.next(this.notificationItems);
      });
  }

  updateAlarmStatus(alarm: IAlarmConfig){
    return this.bizFire.afStore.doc(Commons.userPath(this.bizFire.currentUID)).update({
      alarm: alarm
    });
  }


  async sendTo(uids: string[], notificationConfig: INotificationData) {

    //console.log('sentTo', uids, notificationConfig);

    try {
      const works = uids.map(async uid => {

        console.log('adding notify ', Commons.notificationPath(uid), notificationConfig);

        notificationConfig.to = uid;

        return this.postNotificationToServer(notificationConfig);
      });

      const results = works.map(async w => {
        return await w;
      });

      return results;

    } catch (e) {
      console.error(e);
      throw e;
    }

  }


  deleteNotification(msg: INotification){
    return this.bizFire.afStore.collection(Commons.notificationPath(this.bizFire.currentUID)).doc(msg.mid)
      .delete();
  }



  /*
  * Change to biz-server call later.
  * */
  private postNotificationToServer(notifyData: INotificationData, multiUserIdList?: string[]) {

    console.log('postNotificationToServer', notifyData);

    return new Promise( resolve => {
      const body = {notification: notifyData};
      if(multiUserIdList){
        body['userIdList'] = multiUserIdList;
      }
      const notifyUri = `${this.bizFire.fireFunc}/notification`;
      this.http.post(notifyUri, body)
          .subscribe((result: any) => {
            console.log(`${this.bizFire.fireFunc}/notification:`, result);
            resolve(result);
          }, error => {
            console.error(error);
          });
    });
  }

  buildData(type: NotificationType, info?: NotificationInfo, sid?: string): INotificationData {

    const data = {
      type: type,
      gid: this.bizFire.currentBizGroup.gid,
      to: null,
      from: this.bizFire.uid,
      created: null, // biz-server will set date here.
      info: info || {} as NotificationInfo,
      statusInfo:{ done: false }
    } as INotificationData;

    // set data.bbs = true if type is 'type'.
    data[type] = true;

    // set sid if it exists.
    if(sid){
      data.sid = sid;
    }

    return data;
  }

  /*
  * info.type
  * info.sid
  * .gid
  * info.auth
  * */
  acceptInvitation(notificationData: INotificationData): Promise<any> {

    return new Promise<boolean>( resolve => {
      // get type
      let path;
      if(notificationData.info.type !== 'squad'){
        // this is a group invitation
        path = Commons.groupPath(notificationData.gid);

      } else if(notificationData.info.type === 'squad'){
        // squad
        path = Commons.squadDocPath(notificationData.gid, notificationData.info.sid);
      }

      // get group data
      this.bizFire.afStore.doc(Commons.groupPath(notificationData.gid)).get()
          .pipe(
              map((snap: DocumentSnapshot)=> BizGroupBuilder.buildFromDoc(snap, this.bizFire.uid) )
          )
          .subscribe(async (g: IBizGroup)=>{

            const data = g.data;

            // is ths user a manager?
            if(notificationData.info.auth === STRINGS.FIELD.MANAGER){
              // yes.
              // add to partner
              //data[STRINGS.FIELD.MANAGER][this.bizFire.currentUID] = true;
              await g.addLeader(this.bizFire.uid, true);
            } else if(notificationData.info.auth === STRINGS.FIELD.GUEST){

              await g.addGuest(this.bizFire.uid, true);
            } else {
              // set me as a member
              await g.addMember(this.bizFire.uid, true);
            }

            // send someone joined alarm
            const membersId = g.getMemberIds(false);

            const notifyData = this.buildData('groupInvite');

            notifyData.gid = notificationData.gid;
            notifyData.info.auth = notificationData.info.auth;

            this.sendTo(membersId, notifyData);

            resolve(true);

          });
    });
  }


  /*
  private makeHtml(notification: INotification): Promise<INotificationItem> {

    const data = notification.data;
    if (data.groupInvite === true) {

      return this.makeHtmlInvite(notification);
    } else if(data.post === true){

      return this.makeHtmlPost(notification);

    } else if(data.bbs === true){

      return this.makeHtmlPost(notification);
    }

    else if(data.groupInOut === true){

      return this.makeHtmlInOutNotify(notification);
    }

  }


  private makeHtmlPost(notification: INotification): Promise<INotificationItem>{

    return new Promise<INotificationItem>( resolve => {


      const data = notification.data;
      // get user info
      const userObserver = this.cacheService.userGetObserver(data.from);
      // get group info
      const groupObserver = this.getObserver(Commons.groupPath(data.gid));
      const info = data.info;
      const gid = data.gid;

      // convert
      const item: INotificationItem = notification;
      item.html = { header: null, content: null};

      if (data.post === true) {

        // get squad info
        const squadObserver = this.getObserver(Commons.squadDocPath(gid, info.sid));

        zip(userObserver, groupObserver, squadObserver)
          .subscribe(([u, g, s]) => {

            let team_name;
            let userName;
            if(u != null ){
              userName = u.data['displayName'] || u.data['email'];
            } else {
              userName = `<span class="text-danger">deleted user</span>`;
            }
            if( g != null){
              team_name = g['team_name'];
            } else {
              team_name = `<span class="text-danger">deleted BizGroup</span>`;
            }

            // set content
            item.html.header = [`${userName}`, `posted ${info.title}`];
            item.html.content = [`${info.title}`];
            item.html.link = [`${team_name} > ${s['name']}`, `/squad/${data.gid}/${info.sid}/post`];

            resolve(item);

          });
      }

      // is a bbs post ?
      else if (data.bbs === true) {

        zip(userObserver, groupObserver)
          .subscribe(([u, g]) => {

            const groupData: IBizGroupData = g as IBizGroupData;

            const title = info.title || '';
            let userName;

            if(u != null ){
              userName = u.data['displayName'] || u.data['email'];
            } else {
              userName = `<span class="text-danger">deleted user</span>`;
            }

            // set content
            item.html.header = [`${userName}`, `registered ${title}`];
            item.html.content = [`${userName}${this.langPack['alarm_registered_notice']}`];

            // second array is a routerLink !
            item.html.link = [`${groupData.team_name} > ${title}`, ``];

            resolve(item);

          });
      }

    });

  }

  private makeHtmlInvite(notification: INotification): Promise<INotificationItem>{

    return new Promise<INotificationItem>( resolve => {

      const data = notification.data;
      // get user info
      const userObserver = this.cacheService.userGetObserver(data.from);
      // get group info
      const groupObserver = this.getObserver(Commons.groupPath(data.gid));
      const info = data.info;
      const gid = data.gid;

      // convert
      const item: INotificationItem = notification;

      // to where?
      if (info.type === 'group') {
        // 누가 어느 그룹에
        zip(userObserver, groupObserver)
          .subscribe(([u, g]) => {

            let team_name;
            let userName;
            if(u != null ){
              userName = u.data['displayName'] || u.data['email'];
            } else {
              userName = `<span class="text-danger">deleted user</span>`;
            }
            if( g != null){
              team_name = g['team_name'];
            } else {
              team_name = `<span class="text-danger">deleted BizGroup</span>`;
            }

            const headers = [
              `${userName}`,
              `invited you to BizGroup ${team_name}`
            ];

            const content = [
              `Invitation to <span class="font-weight-bold">${team_name}</span>`,
              this.langPack['invitation_text']
            ];

            item.html = {
              header: headers,
              content: content,
            };
            resolve(item);
          });
      }
    });

  }

   */
/*

  private makeHtmlInOutNotify(notification: INotification): Promise<INotificationItem>{

    return new Promise<INotificationItem>( resolve => {

      const data = notification.data;
      // get user info
      const userObserver = this.cacheService.userGetObserver(data.from);
      // get group info
      const groupObserver = this.getObserver(Commons.groupPath(data.gid));
      const info = data.info;
      const gid = data.gid;

      // convert
      const item: INotificationItem = notification;
      item.html = { header: null, content: null, link: null };

      // squad or group ?
      // this is a group. 현재(b54) 스쿼드 초대 / 탈퇴는 알람 메시지를 안보냄.

      zip(userObserver, groupObserver)
        .subscribe(([u, g])=>{

          let team_name;
          let userName;
          if(u != null ){
            userName = u.data['displayName'] || u.data['email'];
          } else {
            userName = `<span class="text-danger">deleted user</span>`;
          }
          if( g != null){
            team_name = g['team_name'];
          } else {
            team_name = `<span class="text-danger">deleted BizGroup</span>`;
          }

          // user joined a group.
          item.html.header = [`${userName}`, `joined ${team_name}`];
          item.html.content = [`${team_name}`];
          resolve(item);

        });

    });

  }

  private getObserver(userPath: string): Observable<IUser>{
    return this.cacheService.getObserver(userPath);
  }
*/

}
