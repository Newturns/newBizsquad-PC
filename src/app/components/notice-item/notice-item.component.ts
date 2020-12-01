import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {take} from 'rxjs/operators';
import {defaultSquadName, FireDocumentSnapshot, IBizGroup, IBizGroupData, INotification, INotificationData} from '../../_models';
import {NEWCOLORS} from "../../biz-common/colors";
import {Commons, STRINGS} from '../../biz-common/commons';
import {ISquad, ISquadData} from '../../providers/squad.service';
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

    //is it invite?
    if(item.data.type === 'groupInvite'){
      return;
    }

    // is it bbs ?
    if(item.data.type === 'bbs') {

      link += `/${this.langPack['BBS']}`;
      this.pcLinkUrl += '/notice';
    }

    else if(item.data.type === 'video') {

      // 비디오가 종료된 상태인지 확인.
      let videoChatPath = item.data.info.path || `${STRINGS.VIDEO}/${item.data.info.vid}`;
      const videoSnapShot: FireDocumentSnapshot = await this.bizFire.afStore.doc(videoChatPath).get().toPromise();
      if(videoSnapShot.exists && videoSnapShot.get('status') === true){
        // 채팅에서 비디오채팅을 생성했을시 타이틀은 없다.
        // 여기서 새로 만든다.
        // '제목<br>' + '화상채팅 초대가 왔습니다.'
        let title = videoSnapShot.get('title') as string;
        title = title && title.length > 0 ? `${title}<br>`: '';
        title += this.langPack['video_alarm_desc'].substr(0, this.langPack['video_alarm_desc'].indexOf('<br>'));
        // 타이틀 오버라이드
        item.data.info.title = title;

        link = `video`;
        this.pcLinkUrl += '/video';

        if(item.data.info.vid){
          link += `/${item.data.info.vid}`;
          this.pcLinkUrl += `/${item.data.info.vid}`;
        }
      } else {
        // 이미 종료된 비디오 채팅방.
        item.data.info.title = this.langPack['video_chat_deleted']; // 'This video chat has been closed by host'
        this.pcLinkUrl = null;
      }
    } else {

      this.pcLinkUrl += '/squad';

      if (item.data.sid || item.data.parentSid) {

        const sid = item.data.sid || item.data.info.sid;
        // collectionGroup()으로 모든 스쿼드를 조회한다.
        const squad$ = await this.cacheService.findSquad$(sid, item.data.gid);

        if(squad$) {
          const squad: ISquad = await squad$.pipe(take(1)).toPromise();
          const squadData: ISquadData = squad.data;
          if(squadData.default) {
            link += `/${this.langPack['public_square']}`;
            this.pcLinkUrl += `/${sid}`;

          } else {
            if(squadData.parentSid){
              const parentSquad$ = await this.cacheService.findSquad$(squadData.parentSid, item.data.gid);
              if(parentSquad$){
                const parentSquad: ISquad = await parentSquad$.pipe(take(1)).toPromise();
                link += `/${parentSquad.data.name || parentSquad.data.title}`;
              } else {
                link += `/<span class="text-danger">${this.langPack['deleted_post']}</span>`;
              }
            }
            link += `/${squadData.name || squadData.title}`;
            this.pcLinkUrl += `/${sid}`;
          }
        } else {
          // not Squad Data.
          link += `/<span class="text-danger">${this.langPack['deleted_post']}</span>`;
        }

        // add comment id?
        if (item.data.info.cid) {
          this.pcLinkUrl += `&cid=${item.data.info.cid}`;
        }
        // task 일때 TASK 탭 선택
        if(item.data.type === 'calendar'){
          this.pcLinkUrl += `&tab=${item.data.type}`;
        }

      }
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

    // task 의 'task'
    let update = true;
    if(this.item.data.type === 'task' && this.item.data.info.type === 'task') {
      update = false;
    }

    if(update){
      if(this.item.data.statusInfo.done === false) {
        this.item.ref.update({statusInfo: {done: true}});
      }
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
