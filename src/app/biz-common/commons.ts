import { FormControl } from '@angular/forms';
import {IBizGroup, IUser, IUserData} from '../_models';
import {ISquad} from "../providers/squad.service";
import {NEWCOLORS} from "./colors";
import {IChat} from '../_models/message';

export const STRINGS = {
  STRING_BIZGROUPS: 'bizgroups',
  MY_SQUAD_STRING: 'mysquad',
  USERS: 'users',
  WORKS: 'works',
  BILLING: 'billing',
  COMPANY: 'company',
  VIDEO:'video',
  BBS:'bbs',

  FIELD:{
    LEADER: 'leader',
    MEMBER: 'members',
    MANAGER: 'manager',
    GUEST : 'guest'
  },
  GROUP_CHAT: 'groupChat',
  SQUAD_CHAT: 'squadChat',

  COLOR: {
    BIZ_COLOR: '#5b9ced'
  },
  USER_IMAGE_FILENAME: 'profile.jpeg',
  METADATA: 'metaData',
  MEMBER_ARRAY: 'memberArray',
  CHAT_MEMBER: 'member',
  PRIVATE : 'private',
};

export declare type ProcessChangeUpdater = (oldItem: any, newItem: any, change: any) => void;

export class Commons {

  static getSquadSortString(userData : IUserData) : 'name' | 'created' {
    let sort : 'name' | 'created' = 'name';
    if(userData && userData.squadChatSort) {
      sort = userData.squadChatSort.sort || sort;
    }
    return sort;
  }

  static groupSortByIndex(groups : IBizGroup[],indexSort : string[]) : IBizGroup[] {
    //문서 id가 담긴 배열.
    const indexArray : string[] = indexSort;

    return groups.sort((a, b) => {
      let ret = 0;
      if(indexArray.includes(b.gid) && indexArray.includes(a.gid)) {
        ret = indexArray.indexOf(b.gid) < indexArray.indexOf(a.gid) ? 1 : -1;
      }
      return ret
    });
  }

  static groupSortByName(a:IBizGroup, b: IBizGroup ): number{
    let ret = 0;
    if(a.data && a.data.team_name && b.data && b.data.team_name ){
      ret = a.data.team_name.toLowerCase() < b.data.team_name.toLowerCase() ? -1 : 1;
    }
    return ret;
  }

  static processChange(change: any, chatList: any[], key: string, builder: (change: any)=>any, updater?:ProcessChangeUpdater,
                       push = true){

    if(change.payload.doc.exists === false) {
      console.error('processChange found null data. id:', change.payload.doc.id, change.payload.doc.ref.path);
      return;
    }

    const mid = change.payload.doc.id;
    if(change.type === 'added'){

      // add new message to top
      const item = builder(change);

      if(push){
        chatList.push(item);
      } else {
        chatList.unshift(item);
      }

    } else if (change.type === 'modified') {

      // replace old one
      for(let index = 0 ; index < chatList.length; index ++){
        if(chatList[index][key] === mid ){
          // find replacement

          //---------- 껌벅임 테스트 -------------//
          //chatList[index].data = change.payload.doc.data(); // data 만 경신 한다.
          //-----------------------------------//
          const item = builder(change);
          if(updater){

            updater(chatList[index], item, change);
          } else {
            // full replace
            chatList[index] = item;
          }
          break;
        }
      }
    } else if (change.type === 'removed') {
      for (let index = 0; index < chatList.length; index++) {
        if (chatList[index][key] === mid) {
          // remove from array
          chatList.splice(index, 1);
          break;
        }
      }
    } // end if

  }

    static noWhitespaceValidator(control: FormControl): any {
        const isWhitespace = (control.value || '').trim().length === 0;
        const isValid = !isWhitespace;
        return isValid ? null : { 'whitespace': true };
      }

      static squadPath(gid: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/squads`
      }
      static squadDocPath(gid: string, sid: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/squads/${sid}`;
      }
      static subSquadDocPath(gid: string, sid: string, child: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/squads/${sid}/squads/${child}`;
      }
      static messagePath(gid: string, sid: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/squads/${sid}/messages`;
      }
      static messageDocPath(gid: string, sid: string, mid: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/squads/${sid}/messages/${mid}`;
      }

      static notificationPath(uid: string): string {
        return `users/${uid}/notifications`;
      }

      static commentPath(gid: string, sid: string, mid: string): string {
        const path = Commons.messagePath(gid, sid);
        return `${path}/${mid}/comments`;
      }

      static groupPath(gid: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}`;
      }

      static bbsPath(gid: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/bbs`;
      }

      static bbsDocPath(gid: string, bid: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/bbs/${bid}`;
      }

      static schedulePath(gid: string, sid: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/squads/${sid}/calendar`;
      }

      static initialChars(userData: IUserData, count = 2): string {

        let ret;
        ret = userData['displayName'] || userData.email;

        if(ret && ret.length === 0){
          ret = 'U';
        }

        if(ret && ret.length > count -1){
          ret = ret.substr(0, count);
        }

        if(ret === null){
          ret = 'U';
        }

        return ret;
      }

      static userDataPath(gid: string, uid: string): string {
        const path = `${STRINGS.STRING_BIZGROUPS}/${gid}/userData/${uid}`;
        return path;
      }

      static userPath(uid: string): string {
        return `${STRINGS.USERS}/${uid}`;
      }

      static memberUID(members: any): string[] {
        if(members){
          return Object.keys(members).filter(uid => members[uid] === true).map(uid => uid);
        } else {
          throw new Error('member is null');
        }
      }

      // /works : some invite actions
      static userInfoSorter(a: IUser, b: IUser): number {
        let index = 0;
        let a_displayName = a.data.displayName || a.data.email;
        let b_displayName = b.data.displayName || b.data.email;
        if(a_displayName != null && b_displayName != null){
          index = a_displayName > b_displayName ? 1 : -1 ;
        }
        return index;
      }

      // 채팅방 리스트 불러오기
      static  chatPath(gid: string, type = 'group'): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/chat`;
      }
      // 해당 채팅방 문서 정보.
      static chatDocPath(gid: string, cid: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/chat/${cid}`;
      }
      // 멤버 채팅 메세지 작성 경로.
      static chatMsgPath(gid: string, cid: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/chat/${cid}/chat`;
      }
      static chatMsgDocPath(gid:string,cid:string,mid:string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/chat/${cid}/chat/${mid}`;
      }

      static chatImgPath(gid: string, cid: string,mid: string): string {
        return `${gid}/chat/${cid}/${mid}/`;
      }

      static squadChatImgPath(gid: string, sid: string, mid :string): string {
        return `${gid}/${sid}/chat/${mid}/`;
      }

      // 스쿼드 채팅방 정보 (스쿼드 정보)
      static  chatSquadPath(gid: string, sid: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/squads/${sid}`;
      }
      // 스쿼드채팅 메세지 작성 경로.
      static chatSquadMsgPath(gid: string, sid: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/squads/${sid}/chat`;
      }
      static chatSquadMsgDocPath(gid:string,sid:string,mid:string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/squads/${sid}/chat/${mid}`;
      }

      static FindText(text: string): FilterFinder {
        return new FilterFinder(text);
      }

      static chatInputConverter(test: string): string | null {

        let comment = String(test.trim());
        let checkSuccess = comment.length > 0;

        //check empty
        if(checkSuccess) {
          const index = comment.indexOf('\n');
          if (index !== -1) {
            let temp = comment.replace('\n', '');
            checkSuccess = temp.trim().length > 0;
          }
        }

        //convert
        if(checkSuccess){
          comment = comment.replace(/\n/gi, '<br>');
        }

        return checkSuccess ? `${comment}` : null;
      }

      static makeReadFrom(members: any, myUid: string): any {
        //const members = currentChat.data.members;
        const read = {};
        Object.keys(members)
            .forEach(uid => {
              // ser unread false except me.
              read[uid] = {
                unread: uid !== myUid,
                read: uid === myUid ? new Date(): null
              };
            });
        return read;
      }

      static removeHtmlTag(text: string): string {
        let ret: string;
        if(text != null && text.length > 0){

          /* replace <br> to '\n'
          if(ret.indexOf('<br>') !== -1){
            // replace \n
            ret = ret.split('<br>').join('\n');
          }
           */

          // remove tags.
          ret = text.replace(/<[^>]+>/gm, '');
        }
        return ret;
      }

      static isImageFile(file: any): boolean {
        let ret = file.type === 'image/png';
        if(!ret){
          ret = file.type === 'image/jpg';
        }
        if(!ret){
          ret = file.type === 'image/jpeg';
        }
        if(!ret){
          ret = file.type === 'image/gif';
        }
        if(!ret){
          ret = file.type.indexOf('image/') != -1;
        }
        return ret;
      }

      static makeUserStatus(userData : IUserData) {
        switch(this.makeUserStatusMultiPlatform(userData)) {
          case 'online':
            return '#32db64';
            break;
          case 'wait':
            return '#FEA926';
            break;
          case 'busy':
            return '#f53d3d';
            break;
          case 'offline':
            return '#C7C7C7';
            break;
          default :
            return '#C7C7C7';
            break;
        }
      }

      static makeUserStatusMultiPlatform(userData : IUserData) : string {

        let status = 'offline';
        const statusList = ['online','wait','busy'];

        if(userData.onlineStatus == null) {
          return status;
        }

        statusList.forEach(l => {
          if(userData.onlineStatus.web === l
              || userData.onlineStatus.pc === l
              || userData.onlineStatus.mobile === l) {
            status = l;
          }
        });

        return status;

      }


      static sortDataByCreated(sort: 'asc'|'desc' = 'asc'){
        return  (a: any, b: any) => {
          let ret = 0;
          if(a.data && a.data.created && b && b.data && b.data.created){
            if(sort === 'asc'){
              // 위로 보내는게 -1
              ret = a.data.created.toMillis() < b.data.created.toMillis() ? -1 : 1;
            } else {
              ret = a.data.created.toMillis() > b.data.created.toMillis() ? -1 : 1;
            }
          }
          return ret;
        }
      }

      static sortDataByLastMessage(){
        return  (a: IChat, b: IChat)=>{
          // lastMessage 가 없으면 제일 밑으로 보낸다.
          let ret = 1;
          if(a.data.lastMessage == null){
            return 1;
          }
          if(b.data.lastMessage == null){
            return -1;
          }
          if(a.data.lastMessage && b.data.lastMessage){
            // a 가 오래된 경우 밑으로 보낸다.
            ret = a.data.lastMessage.created.toMillis() < b.data.lastMessage.created.toMillis() ? 1 : -1;
          }
          return ret;
        }
      }

      static squadSortByName(a:ISquad, b: ISquad ): number{
        let ret = 0;
        if(a.data && a.data.name && b.data && b.data.name ){
          ret = a.data.name.toLowerCase() > b.data.name.toLowerCase() ? 1 : -1;
        }
        return ret;
      }

  // #4343434
  static getGroupColorStyleName(value) : string {
    switch (value) {
      case NEWCOLORS.duskblue.main:
        return 'duskblue';
      case NEWCOLORS.blue.main:
        return 'blue';
      case NEWCOLORS.dark.main:
        return 'dark';
      case NEWCOLORS.green.main:
        return 'green';
      case NEWCOLORS.orange.main:
        return 'orange';
      case NEWCOLORS.purple.main:
        return 'purple';
      case NEWCOLORS.red.main:
        return 'red';
    }
  }

}


class FilterFinder {
  text: string;
  private _result: boolean = false;
  constructor( text: string) {
    if(text){
      this.text = text.trim().toLowerCase();
    }
  }

  from(data: string): FilterFinder {
    if(this._result !== true){
      if(data){
        if(this.text){
          this._result = data.trim().toLowerCase().indexOf(this.text) !== -1;
        }
      }
    }
    return this;
  }

  get result(){
    return this._result;
  }
}
