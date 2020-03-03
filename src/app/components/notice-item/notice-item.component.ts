import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {take} from 'rxjs/operators';
import {IBizGroup, IBizGroupData, INotification, INotificationData} from '../../_models';
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

    if(this.linkUrl.length > 0){

      this.tokenService.notifyWebJump(item,this.pcLinkUrl);

    }
  }

  private async makeLink(item: INotification) {

    const groupData = await this.getGroupObserver(item.data.gid);
    let link = groupData.team_name;

    // add gid
    this.linkUrl.push(item.data.gid);

    this.pcLinkUrl = item.data.gid;

    // is it bbs ?
    if(item.data.type === 'bbs'){

      link += `/${this.langPack['BBS']}`;
      this.linkUrl.push('notice');
      this.pcLinkUrl += '/notice';

    }

    //is it invite?
    if(item.data.type === 'groupInvite'){
      // ??

      return ;
    }

    // is it video ?
    if(item.data.type === 'video'){
      // ??
      link = `video`;
      this.linkUrl = [];
      this.linkUrl.push('video');
      this.pcLinkUrl += '/video';

      if(item.data.info.vid){
        link += `/${item.data.info.vid}`;
        this.linkUrl.push(item.data.info.vid);
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
                link += `/${g.team_name}`;
              }
            }

          } else {
            link += `/${squadData.name || squadData.title}`;
          }

          // add squad
          this.linkUrl.push('squad');
          this.linkUrl.push(sid);

          // add comment id?
          if (item.data.type === 'comment' && item.data.info.cid) {
            if (this.linkParam == null) {
              this.linkParam = {};
            }
            this.linkParam['cid'] = item.data.info.cid;
          }
          // task 일때 TASK 탭 선택
          if(item.data.type === 'task' || item.data.type === 'calendar'){
            if (this.linkParam == null) {
              this.linkParam = {};
            }
            // set ?tab=task
            this.linkParam['tab'] = item.data.type;
          }
        }
      } // end sid
    }

    this.link$.next(link);

    // if(item.data.type === 'post' || item.data.type === 'comment'){
    //
    //   // is it post or comment?
    //   if(item.data.sid != null || item.data.info && item.data.info.sid != null){
    //     // add squad name
    //     const sid = item.data.sid || item.data.info.sid;
    //     const squadName: ISquadData = await this.cacheService.getPromise(Commons.squadDocPath(item.data.gid, sid));
    //     if(squadName){
    //       link += `/${squadName.name || squadName.title}`;
    //       // add squad
    //       this.linkUrl.push('squad');
    //       this.linkUrl.push(sid);
    //
    //       this.pcLinkUrl += `/squad/${sid}`;
    //
    //       // add comment id?
    //       if(item.data.type === 'comment' && item.data.info.cid){
    //         if(this.linkParam == null){
    //           this.linkParam = {};
    //         }
    //         this.linkParam['cid'] = item.data.info.cid;
    //       }
    //     }
    //   }
    // }
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
    /*if(this.item.data.statusInfo.done !== true){
      this.item.ref.update({
        statusInfo: {
          done: true
        }
      });
    }*/

    // todo: 알람 done 토글
    // 이건 임시 코드.
    // 버튼을 누를때마다 done 값을 전환한다.
    // 사양 확정후 위의 주석 코드로 바꿀것.
    this.item.ref.update({
      statusInfo: {
        done: !this.item.data.statusInfo.done
      }
    });
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
      ret = 'comment'
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
