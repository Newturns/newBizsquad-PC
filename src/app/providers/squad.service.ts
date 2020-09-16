import { Injectable } from '@angular/core';
import {Observable } from 'rxjs';
import {Commons, STRINGS} from '../biz-common/commons';
import { takeUntil, map } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import {IBizGroupBase} from "../_models";
import {IChat} from "../_models/message";
import {TakeUntil} from "../biz-common/take-until";
import {BizFireService} from '../biz-fire/biz-fire';

export interface ISquad extends IBizGroupBase{
  sid?: string,
  data?: ISquadData,
  gid?: string,
  members?: any,
  guest?: boolean
}

export interface ISquadData {

  // 2020.09.05 호환을 위해 남겨둔다.
  members?: any,
  // 2020.09.05 새로운 멤버 저장 배열
  memberArray?: string[],

  created: any,
  type: string,

  // public 일경우 squad 멤버는 group 멤버 전체.
  public?: boolean,

  // general squad flag.
  general?: boolean,
  agile?: boolean,

  gid?: string,
  name?: string,
  title?: string,
  default?: boolean,
  manager?: any,
  guest? : any,
  subType?: string,
  status?: boolean,
  description?: string,
  color?:string,
  photoURL?: string,
  photoPath?: string,

  createdBy?: string,

  /*
  * Well Done 시간 기록.
  * */
  closed?: any

  //스쿼드 내의 유저 역할(업무)
  userTask?: any,

  // 2020.08.20. 차일드 스쿼드 added.
  // 왼쪽 트리에 표시용으로 저장.
  // 실제 firebase 위치는 squads/<sid>/squads/<child> 식으로 반복.
  children?: string[],
  // parent sid: 부모 sid 를 적어놓는다.
  parentSid?: string,
}

export interface IUserDataDoc {

    folders?: any[],
    privateFolders?: any[]
}


@Injectable({
    providedIn: 'root'
})

export class SquadService extends TakeUntil{

  userCustomData: any;

  constructor(public bizFire : BizFireService) {
    super();

    this.bizFire.userData.pipe(this.takeUntil).subscribe(u => {
      this.userCustomData = u;
    });
  }

  getMySquadLisObserver(gid: string) : Observable<ISquad[]> {
      const path = `${STRINGS.STRING_BIZGROUPS}/${gid}/squads`;
      return this.bizFire.afStore.collection(path, ref => {
          let query: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
          query = query.orderBy('name');
          return query;
      })
          .snapshotChanges()
          .pipe(takeUntil(this.bizFire.onUserSignOut),
              map(docs => docs
                  .filter(d=>{
                      // get all
                      let ret = true;

                      // but exclude false or 0 if status field exist.
                      const status = d.payload.doc.get('status');
                      ret = status === true;
                      return ret;
                  })
                  .filter(d =>{

                      let ret =false;

                      // get all public squads
                      if(!ret){
                          const type = d.payload.doc.get('type');
                          if(type){
                              ret = type === 'public';
                          }
                      }
                      // and add my private squads.
                      if(!ret){
                          // this squad is a private s.
                          const members = d.payload.doc.get('members');
                          if(members){
                              ret = members[this.bizFire.currentUID] === true;
                          }
                      }
                      return ret;

                  }).map(d => ({sid: d.payload.doc.id, data: d.payload.doc.data(), ref : d.payload.doc.ref} as ISquad))
              )
          );
  }
  makeSquadMenuWith(userData: any, squadList: IChat[]){
      console.log('makeSquadMenuWith', userData, squadList);

      const folders = [];
      const privateFolders = [];
      const addedSqaud = {};
      const bookmark: IChat[] = [];

      if(userData != null){
          const publicFolders = userData.folders;
          // create custom folders
          if(publicFolders != null){
              // folder 정렬
              publicFolders.sort( (a, b) => a.index - b.index);

              for(let itr = 0; itr < publicFolders.length; itr ++){

                  const {index, name, squads} = publicFolders[itr];
                  const displayFolder = {index, name, squads:[]};

                  if(squads != null){
                      // does this squad exists?
                      squads.forEach(savedSquad => {

                          for(let idx = 0; idx < squadList.length; idx ++){
                              if(squadList[idx].sid === savedSquad.sid){
                                  // * this squad exists.
                                  // add to display
                                  displayFolder['squads'].push(squadList[idx]);
                                  // now delete from original list
                                  // squadList.splice(idx, 1);
                                  addedSqaud[squadList[idx].sid] = true;
                                  // now go to next saved squad.
                                  break;
                              }
                          }
                      });
                  }
                  // add folder
                  folders.push(displayFolder);
              }
          // loaded.
          }

          // b.18 private squad added.
          const agileFolders = userData['agileFolders'];
          if(agileFolders != null){

              for(let agileFolderIndex = 0; agileFolderIndex < agileFolders.length; agileFolderIndex ++){

                  const {index, name, squads} = agileFolders[agileFolderIndex];
                  const displayFolder = {index, name, squads:[]};

                  if(squads != null){

                      // does this squad exists?
                      squads.forEach(savedSquad => {

                          for(let idx = 0; idx < squadList.length; idx ++){

                              if(squadList[idx].sid === savedSquad.sid){
                                  // * this squad exists.
                                  // add to display
                                  displayFolder['squads'].push(squadList[idx]);

                                  // now delete from original list
                                  // squadList.splice(idx, 1);
                                  addedSqaud[squadList[idx].sid] = true;
                                  // now go to next saved squad.
                                  break;
                              }
                          }
                      });
                  }

                  // add folder
                  privateFolders.push(displayFolder);
              }
              // loaded.
          }

      }
      const privateSquads = squadList.filter(s => {
        let ret = s.data.agile && s.data.type !== 'public' && addedSqaud[s.cid] !== true;
        if(ret && this.isFavoriteSquad(userData,s.cid)){
          bookmark.push(s);
          ret = false;
        }
        return ret;
      });

      const publicSquads = squadList.filter(s => {
        let ret = s.data.general && addedSqaud[s.cid] !== true;
        if(ret && this.isFavoriteSquad(userData,s.cid)) {
          bookmark.push(s);
          ret = false;
        }
        return ret;
      });

      // console.log(folders, privateSquads, publicSquads);
      return { folders,privateFolders, privateSquads, publicSquads, bookmark };
  }


  isFavoriteSquad(userData: any,sid: string): boolean {
    let ret = false;
    if(userData && userData[sid]) {
      ret = userData[sid]['bookmark'] === true;
    }
    return  ret;
  }

  setFavorite(sid: string, bookmark: boolean){
    const gid = this.bizFire.currentBizGroup.gid;
    const path = Commons.userDataPath(gid, this.bizFire.uid);

    // get delete or add
    if(this.userCustomData == null) {
      this.userCustomData = {[sid]: {}};
    }
    if(this.userCustomData[sid] == null){
      this.userCustomData[sid] = { bookmark: false };
    }

    this.userCustomData[sid]['bookmark'] = bookmark;
    this.bizFire.afStore.doc(path).set(this.userCustomData, {merge: true});
  }

}
