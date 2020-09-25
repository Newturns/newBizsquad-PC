import {Injectable, Optional, SkipSelf} from '@angular/core';
import {debounceTime, filter, map, mergeMap, switchMap, takeUntil, tap} from 'rxjs/operators';
import {User} from 'firebase/app';
import {BehaviorSubject, combineLatest, merge, Observable, of, Subject, zip} from 'rxjs';
import {DocumentChangeAction} from '@angular/fire/firestore';
import {FireDocumentSnapshot, FireQuerySnapshot, IBizGroupData} from '../_models';
import {IMessageData} from '../_models/message';
import {BizFireService} from '../biz-fire/biz-fire';
import {ISquadData} from './squad.service';

export interface IUnreadMap {
  [gid: string]: {
    [id: string]: IUnreadInfo
  }
}

export interface IUnreadInfo {
  gid?: string,
  type?: string, // squad / personal
  id?: string, //cid/sid
  data?: IMessageData[],
  doc?: FireDocumentSnapshot,
  observer$?: Observable<DocumentChangeAction<any>[]>;
  unreadCount?: number
}

@Injectable({
  providedIn: 'root'
})
export class UnreadService {

  unreadMap$ = new BehaviorSubject<IUnreadMap>(null);
  unreadMessageMap: IUnreadMap;
  private lastLoadedCidList: IUnreadMap;

  //2020.09.01
  unreadList$ = new BehaviorSubject<IMessageData[]>(null);


  // 2020.08.31
  private gidList: string[];
  private gidList$ = new Subject<string[]>();
  private map: any[];


  // --- members 를 memberArray 로 포팅 하는 함수 ---- //
  // --- taxline 까지 적용 끝나면 삭제할 것. ------------ //
  private async convertMembersToMemberArray(snapshot: FireQuerySnapshot){
    let batch = this.bizFire.afStore.firestore.batch();
    let batchAdded = 0;
    for(let doc of snapshot.docs) {
      const value: any = doc.data();
      if(value.members && value.memberArray == null){
        const memberArray: string[] = Object.keys(value.members);
        batch.update(doc.ref, {
          memberArray: memberArray
        });
        batchAdded ++;
      }
      if(batchAdded > 450){
        console.error('members to memberArray 포팅 실시증...', batchAdded);
        await batch.commit();
        batch = this.bizFire.afStore.firestore.batch();
        batchAdded = 0;
      }
    }
    if(batchAdded > 0){
      console.error('members to memberArray 포팅 실시증...', batchAdded);
      await batch.commit();
    }
  }

  private async updateMembersToMemberArray(){
    console.error(`updateMembersToMemberArray started... `);

    /////////// 그룹들 ///////////
    const snapshot: FireQuerySnapshot = await this.bizFire.afStore.collectionGroup(`bizgroups`).get().toPromise();
    await this.convertMembersToMemberArray(snapshot);

    /////////// 모든 스쿼드  ///////////
    const squads: FireQuerySnapshot = await this.bizFire.afStore.collectionGroup(`squads`).get().toPromise();
    await this.convertMembersToMemberArray(squads);

    /////////// 모든 채팅  ///////////
    const chats: FireQuerySnapshot = await this.bizFire.afStore.collectionGroup(`chat`).get().toPromise();
    await this.convertMembersToMemberArray(chats);

    console.error(`updateMembersToMemberArray finished... `);

  }

  constructor(@Optional() @SkipSelf() otherMe: UnreadService,
              private bizFire: BizFireService) {
    if(otherMe) throw 'UnreadService must exist only one !!!';

    this.bizFire.afAuth.authState
      .pipe(
        switchMap((user: User)=>{

          this.map = [];
          if(user == null) return of(null);

          const s$ = this.bizFire.afStore.collectionGroup('squads',ref=>
            ref.where('status', '==', true)
              .where('type', '==', 'private')
              // .where('general', '==', false)
              .where(`memberArray`, 'array-contains', this.bizFire.uid)
          ).stateChanges(['added', 'removed']);

          const c$ = this.bizFire.afStore.collectionGroup('chat',ref=>
            ref.where('status', '==', true)
              .where('type', '==', 'member')
              .where(`memberArray`, 'array-contains', this.bizFire.uid)
          ).stateChanges(['added', 'removed']);

          return merge(s$, c$).pipe(this.bizFire.takeUntilUserSignOut) as Observable<DocumentChangeAction<any>[]>;

        }),
        switchMap((changes: DocumentChangeAction<any>[])=>{
          if(changes){
            let notify = false;
            changes.forEach(c => {
              const data: ISquadData = c.payload.doc.data();
              const id = c.payload.doc.id;
              // console.log(`[${c.type}], ${data.type}, me: ${data.members[this.bizFire.uid]}, gid: ${data.gid}, ${this.gidList.includes(data.gid)}`);

              if(c.type === 'added'){
                if(this.map.findIndex(v => v.id === id) === -1){
                  const v = {
                    id: c.payload.doc.id,
                    doc: c.payload.doc,
                    observer$: this.bizFire.afStore.collection(`${c.payload.doc.ref.path}/chat`, ref=>
                      ref.where(`read.${this.bizFire.uid}.unread`, '==', true)
                        .where('isNotice', '==', false)
                    ).valueChanges().pipe(this.bizFire.takeUntilUserSignOut),
                  };
                  this.map.push(v);
                  notify = true;
                }
              }
              if(c.type === 'removed'){
                const index = this.map.findIndex(v => v.id === id);
                if(index !== -1){
                  this.map.splice(index, 1);
                  notify = true;
                }
              }
            });

            return combineLatest(this.map.map(v => v.observer$));

          } else return of([])
        }),
        // 결과는 [[배열], [배열]]..  빈배열 인자는 제거한다.
        map((value: any[])=> value.filter(v=>v.length > 0))
      )
      .subscribe((value: any[])=>{

        let list: IMessageData[] = null;

        if(value && value.length > 0){
          // flatten array and send notify.
          list = [];
          value.forEach( (valueArray: IMessageData[]) => {
            list = list.concat(valueArray);
          });
        }

        this.unreadList$.next(list);

      });

  }//init

  private clearAll(){
    this.unreadMap$.next(null);
    this.unreadMessageMap = null;
  }

  static isSameMap(a: IUnreadMap, b: IUnreadMap): boolean{
    let same = Object.keys(a).length === Object.keys(b).length;
    if(same){
      for(let gid of Object.keys(a)){
        if(b[gid] == null) {
          same = false;
        } else {
          same = Object.keys(a[gid]).length === Object.keys(b[gid]).length;
        }
        if(!same) break;
      }
    }
    return same;
  }

}
