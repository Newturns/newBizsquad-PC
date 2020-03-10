import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {take} from 'rxjs/operators';
import {defaultSquadName, IBizGroup, IBizGroupData, INotification, INotificationData} from '../../_models';
import {NEWCOLORS} from "../../biz-common/colors";
import {Commons} from "../../biz-common/commons";
import {ISquadData} from "../../providers/squad.service";
import {BizComponent} from '../classes/biz-component';
import {BizFireService} from '../../biz-fire/biz-fire';
import {CacheService} from '../../core/cache/cache';
import {TokenProvider} from '../../biz-common/token';


@Component({
  selector: 'biz-notice-item',
  templateUrl: './notice-item.component.html',
  styleUrls: ['./notice-item.component.scss'],
})

export class NoticeItemComponent extends BizComponent implements OnInit {


  get item(): INotification {
    return this._item;
  }

  @Input()
  set item(value: INotification) {
    this._item = value;
    this.makeLink(value); // fire link$ with link string.
  }

  private _item: INotification;

  done = false;

  link$: BehaviorSubject<string> = new BehaviorSubject<string>(null);

  @Output()
  onAccept = new EventEmitter<INotification>();

  private linkUrl: string[] = [];
  private linkParam;

  private pcLinkUrl : string;

  // 세로 실선 배경색.
  subColor = '#2a8bf2';
  group: IBizGroup;

  constructor(private bizFire: BizFireService,
              private tokenService : TokenProvider,
              private cacheService: CacheService) {
    super();
    this.loadLang(bizFire);

  }

  ngOnInit() {

    this.done = this.item.data.statusInfo.done;

    this.bizFire.onBizGroupSelected
      .pipe(this.takeUntil)
      .subscribe((g: IBizGroup)=>{
        this.group = g;
        this.subColor = this.group.data.team_subColor || NEWCOLORS.duskblue.sub;
      });
  }

  getUserObserver(uid: string){
    return this.cacheService.userGetObserver(uid);
  }

  getGroupObserver(gid: string): Promise<IBizGroupData> {
    return new Promise<IBizGroupData>(resolve => {
      this.cacheService.getObserver(Commons.groupPath(gid)).pipe(take(1)).subscribe(data => resolve(data));
    });
  }


  onLinkClicked(item: INotification){

    // console.log(item, this.linkUrl, this.linkParam);

    if(this.pcLinkUrl.length > 0){

      console.log(this.pcLinkUrl);
      this.tokenService.notifyWebJump(item,this.pcLinkUrl);

    }
  }

  private async makeLink(item: INotification) {

    const groupData = await this.getGroupObserver(item.data.gid);
    if(groupData == null){
      console.error('item.data.gid 정보가 없는 알람 발견(화면에 비표시):', item);
      return ;
    }

    let link = groupData.team_name;

    this.pcLinkUrl = item.data.gid;

    // is it bbs ?
    if(item.data.type === 'bbs'){

      link += `/${this.langPack['BBS']}`;
      this.pcLinkUrl += '/notice';

    }

    //is it invite?
    if(item.data.type === 'groupInvite'){
      return ;
    }

    // is it video ?
    if(item.data.type === 'video'){
      // ??
      link = `video`;
      this.pcLinkUrl += '/video';

      if(item.data.info.vid){
        link += `/${item.data.info.vid}`;
        this.pcLinkUrl += `/${item.data.info.vid}`;
      }

    }

    else {
      // sid 정보가 있을때만 링크 조립 가능.
      const sid = item.data.sid || (item.data.info && item.data.info.sid);
      if (sid) {
        // add squad name

        const squadData: ISquadData = await this.cacheService.getPromise(Commons.squadDocPath(item.data.gid, sid));
        if (squadData) {

          //디폴트 스쿼드일때 그룹명으로 표시.
          if(squadData.default) {
            if(squadData.gid){
              const g: IBizGroupData = await this.cacheService.getPromise(Commons.groupPath(squadData.gid));
              if(g){
                link += `/${defaultSquadName}`;
              }
            }

          } else {
            link += `/${squadData.name || squadData.title}`;
          }

          // add squad
          this.pcLinkUrl += `/squad/${sid}`;

          // add comment id?
          if (item.data.type === 'comment' && item.data.info.cid) {
            if (this.linkParam == null) {
              this.linkParam = {};
            }
            this.linkParam['cid'] = item.data.info.cid;
          }
          // task 일때 TASK 탭 선택
          if(item.data.type === 'task' || item.data.type === 'calendar'){
            this.pcLinkUrl += `?tab=${item.data.type}`;
          }
        }
      } // end sid
    }

    this.link$.next(link);
  }


  onDelete(){
    if(this.item.ref){
      this.item.ref.delete();
    }
  }


  onAvatarClick(e: Event){
    e.stopPropagation();

    console.log(this.item);

    // staus 를 done으로 수정.
    if(this.item.data.statusInfo.done !== true && this.item.data.type !== 'task'){
      this.item.ref.update({ statusInfo: { done: true } });
    }
  }

  onAcceptClicked(){
    this.onAccept.emit(this.item);
  }

  fromWhere(data : INotificationData){
    const type = data.type;
    let ret: string;
    if(type === 'post'){
      ret = 'posted';
    } else if (type === 'bbs'){
      ret = 'notice'
    } else if (type === 'comment'){
      ret = 'commented'
    } else if (type === 'schedule'){
      ret = 'schedule'
    } else if (type === 'video'){
      ret = 'video'
    } else if (type === 'groupInvite'){
      ret = 'invited'
    } else if (type === 'calendar'){
      ret = 'scheduled';
    } else if (type === 'task'){
      // 타입이 태스크일경우
      // 생성이나 컨펌이냐를 보자.
      if(data.info.type === 'confirmed'){
        ret = 'confirmed';
      } else {
        ret = 'created task';
      }
    }

    return ret || '';
  }
}
