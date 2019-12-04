import { FormControl } from '@angular/forms';
import {IUser, IUserData} from "../_models";
import {ISquad} from "../providers/squad.service";
import {NEWCOLORS} from "./colors";

export const STRINGS = {
  STRING_BIZGROUPS: 'bizgroups',
  MY_SQUAD_STRING: 'mysquad',
  USERS: 'users',
  WORKS: 'works',
  COMPANY: 'company',
  BBS:'bbs',

  FIELD:{
    MEMBER: 'members',
    MANAGER: 'manager',
    PARTNER: 'partners'
  },
  GROUP_CHAT: 'groupChat',
  SQUAD_CHAT: 'squadChat',

  COLOR: {
    BIZ_COLOR: '#5b9ced'
  },
  USER_IMAGE_FILENAME: 'profile.jpeg',
  METADATA: 'metaData',
};

export declare type ProcessChangeUpdater = (oldItem: any, newItem: any, change: any) => void;

export class Commons {

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

        return checkSuccess ? `<p>${comment}</p>` : null;
      }


      static makeReadFrom(members: any, myUid: string): any {
        //const members = currentChat.data.members;
        const read = {};
        if(members == null){
          throw new Error('empty members param');
        }
        Object.keys(members)
          .filter(uid => uid !== myUid) // everyone except me
          .forEach(uid => {
            // ser unread false except me.
            read[uid] = {unread: uid !== myUid, read: uid === myUid ? new Date(): null};
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
        switch(userData.onlineStatus) {
          case 'online':
            return '#32db64';
            break;
          case 'wait':
            return '#FFBF00';
            break;
          case 'busy':
            return '#f53d3d';
            break;
          case 'offline':
            return '#C7C7C7';
            break;
          case undefined :
            return '#C7C7C7';
            break;
        }
      }


      static sortDataByCreated(key = 'created', sort = 'asc'){
        return  (a: any, b: any) => {
          let ret = 0;
          if(a.data && a.data[key] && b && b.data && b.data[key]){
            ret = a.data[key].toMillis() > b.data[key].toMillis() ? -1 : 1;
          }
          return ret;
        }
      }

      static sortDataByLastMessage(asc = true){
        return  (a: any, b: any) => {
          let ret = 0;
          const down = asc ? 1 : -1;
          const up = asc ? -1 : 1;
          const key = 'lastMessage';
          if(a.data && a.data[key] && b && b.data && b.data[key]){
            ret = a.data[key].created.toMillis() > b.data[key].created.toMillis() ? down : up;
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
