import { Component, OnInit } from '@angular/core';
import {BizFireService} from '../../biz-fire/biz-fire';
import {IBizGroup} from '../../_models';
import {merge, Observable, of, Subject} from 'rxjs';
import {ISquad, SquadService} from '../../providers/squad.service';
import {switchMap, takeUntil} from 'rxjs/operators';
import {TokenProvider} from '../../biz-common/token';
import {ChatService} from '../../providers/chat.service';
import {DocumentChangeAction} from '@angular/fire/firestore';
import {SquadBuilder} from '../../biz-fire/squad';
import {animate, state, style, transition, trigger} from '@angular/animations';

@Component({
  selector: 'app-squad',
  templateUrl: './squad.page.html',
  styleUrls: ['./squad.page.scss'],
  animations:[
    trigger('openClose', [
      state('open', style({
        height: '*'
      })),
      state('closed', style({
        height: '0'
      })),
      transition('open <=> closed', [
        animate('.15s'),
      ]),
    ])
  ]
})
export class SquadPage implements OnInit {

  langPack = {};
  currentBizGroup : IBizGroup;

  // sort pipe
  sortBy: 'name' | 'created' = 'created';
  // filter type pipe
  type: string;

  allSquadList : ISquad[];

  private _unsubscribeAll;

  constructor(private bizFire : BizFireService,
              public tokenService : TokenProvider) {
    this._unsubscribeAll = new Subject<any>();
  }

  ngOnInit() {

    this.bizFire.onLang.pipe(takeUntil(this._unsubscribeAll)).subscribe((l: any) => this.langPack = l.pack());

    this.bizFire.onBizGroupSelected
    .pipe(
        takeUntil(this._unsubscribeAll),
        switchMap((group : IBizGroup) => {

          console.log("1) S.Q.U.A.D - onBizGroupSelected");
          if(group == null) {
            this.allSquadList = null;
            return of(null);
          }
          this.currentBizGroup = group;
          this.allSquadList = [];

          // 모든 부모/자식 + 제네럴 프라이빗/애자일 스쿼드 합쳐서 쿼리
          const s$ = this.bizFire.privateSquads$(group.gid);
          // 제너럴 퍼블릭 만 따로 쿼리
          const generalPublic$ = this.bizFire.publicSquads$(group.gid);

          return merge(s$,generalPublic$);
        })
    )
    .subscribe( (changes: DocumentChangeAction<any>[]) => {

      if(changes){
        const list = this.allSquadList;
        changes.forEach(c => {
          const item: ISquad = SquadBuilder.buildFromDoc(c.payload.doc, this.bizFire.uid);

          if(c.type === 'added') {
            let add = true;
            // 게스트일때는 리스트에 제너럴스쿼드를 뺀다
            if(item.data.general){
              if(this.bizFire.currentBizGroup.isGuest() === true){
                add = false;
              }
            }
            if(add && list.findIndex(s => s.sid === item.sid) === -1){
              list.push(item);
            }
          }
          if(c.type === 'modified') {
            const index = list.findIndex(s => s.sid === item.sid);
            // console.log('squad', item.sid, c.type, item.data);
            if(index !== -1){
              // list[index] = item;
              //데이터만 교체 - 자식스쿼드를 펼친상태에서 부모스쿼드의 리더가 스쿼드명을
              //변경했을 때 자동으로 접히는 것을 방지.
              list[index].data = item.data;
            }

            //추가 - 자식스쿼드 명 변경 시 데이터 갱신되도록 배열교체.
            if(item.data.parentSid) {
              const parent: ISquad = list.find(parent => parent.sid === item.data.parentSid);
              if(parent) {
                parent.children = parent.children || [];
                const index = parent.children.findIndex(s => s.sid === item.sid);
                if(index !== -1) {
                  parent.children.splice(index, 1, item);
                }
              }
            }
          }
          if(c.type === 'removed') {
            const index = list.findIndex(s => s.sid === item.sid);
            if(index !== -1){
              list.splice(index, 1);
              // 만약 자식이 없어진 경우,
              // 부모에서도 삭제한다.
              if(item.data.parentSid){
                const parent: ISquad = list.find(parent => parent.sid === item.data.parentSid);
                if(parent && parent.children && parent.children.find(savedSquad => savedSquad.sid == item.sid)){
                  parent.children.splice(parent.children.findIndex(savedSquad => savedSquad.sid == item.sid), 1);
                  if(parent.children.length === 0) parent.children = null;
                }
              }
            }
          }
        });

        // 자식 스쿼드를 부모 스쿼드밑으로 복사한다. (원본을 이동하는게 아니다. 포인터 복사)
        list.filter(s => s.data.parentSid)
          .forEach(s => {
            const parent: ISquad = list.find(parent => parent.sid === s.data.parentSid);
            if(parent){
              parent.children = parent.children || [];
              if(parent.children.find(savedSquad => savedSquad.sid == s.sid) == null){
                parent.children.push(s);
              }
            }
          });
      }
    });
  }


  onSort(type: any){
    this.sortBy = type;
  }
  onTypeFilter(type: any){
    this.type = type;
  }

  isFavoriteSquad(sid: string): boolean {
    return this.bizFire.userDataValue[sid] && this.bizFire.userDataValue[sid]['bookmark'] === true
  }

  filterGeneral(forceType?: string): (s: ISquad)=>boolean {
    return (s: ISquad)=>{

      if(s.data.status === false) return false;

      // 2020.09.04
      // 풀 스쿼드 리스트에는 부모/자식 스쿼드가 혼재되어있다.
      // 이 함수는 톱레벨 부모 스쿼드 만 표시한다.
      if(s.data.parentSid){
        // 이 스쿼드는 자식 스쿼드이므로 화면에 표시안한다.
        return false;
      }

      let ret = false;
      if(forceType){
        if(forceType === 'general'){
          ret = s.data.general === true;
        }
        if(!ret && forceType === 'agile'){
          ret = s.data.agile === true;
        }
        if(!ret && forceType === 'bookmark'){
          ret = this.isFavoriteSquad(s.sid);
        }
      }

      // 한번 걸러진 애들중에서 다시 타입으로 거른다.
      if(ret === true && this.type){
        if(this.type === 'general'){
          ret = s.data.general === true;
        }
        if(this.type === 'agile'){
          ret = s.data.agile === true;
        }
        if(this.type === 'bookmark'){
          ret = this.isFavoriteSquad(s.sid);
        }
      }

      return ret;
    }
  }

  subSquadTrackBy(index: number, s: ISquad){
    return s.sid;
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

}
