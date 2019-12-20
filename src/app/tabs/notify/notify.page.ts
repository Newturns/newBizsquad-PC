import { Component, OnInit } from '@angular/core';
import {ConfigService} from '../../config.service';
import {Router} from '@angular/router';
import {IBizGroupData, ICustomMenu, INotification, INotificationItem} from '../../_models';
import {BehaviorSubject, combineLatest, Subject} from 'rxjs';
import {BizFireService} from '../../biz-fire/biz-fire';
import {Commons} from '../../biz-common/commons';
import {TakeUntil} from '../../biz-common/take-until';
import {NotificationService} from '../../core/notification.service';
import {Electron} from '../../providers/electron';
import {PopoverController} from '@ionic/angular';
import {WarnPopoverComponent} from '../../components/warn-popover/warn-popover';
import {filter, take, takeUntil} from 'rxjs/operators';
import {CacheService} from '../../core/cache/cache';
import {TokenProvider} from '../../biz-common/token';

@Component({
  selector: 'app-notify',
  templateUrl: './notify.page.html',
  styleUrls: ['./notify.page.scss'],
})
export class NotifyPage implements OnInit {

  langPack = {};

  messages: INotification[];

  // filter gid
  currentFilteredGid$ = new BehaviorSubject<string>(null);

  // filter type
  filterNoticeType$ = new BehaviorSubject<ICustomMenu>(null);

  // full original list
  originalList$ = new BehaviorSubject<INotification[]>(null);

  noticeTypes: ICustomMenu[];

  noticeGidFilter: ICustomMenu[];

  // DELETE READ button show/hide
  hasFinished = false;

  private _unsubscribeAll;

  constructor(private configService : ConfigService,
              private notificationService : NotificationService,
              private bizFire : BizFireService,
              public electronService : Electron,
              private popoverCtrl : PopoverController,
              private cacheService : CacheService,
              private tokenService : TokenProvider,
              private router : Router) {
    this._unsubscribeAll = new Subject<any>();
  }

  ngOnInit() {
    this.bizFire.onLang.pipe(takeUntil(this._unsubscribeAll)).subscribe((l: any) => this.langPack = l.pack());

    combineLatest(this.originalList$, this.filterNoticeType$, this.currentFilteredGid$)
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(([list, type, gid])=>{
          if(type == null || type.id === 'all'){
            // set to new received full list.
            this.messages = list;
          } else {
            const menu = this.noticeTypes.find(m => m.id === type.id);
            // noticeTypes already has a filtered array
            this.messages = menu.data;
          }
          // show only some gid.
          if(gid != null){
            this.messages = this.messages.filter(item => item.data.gid === gid);
          }
        });

    this.notificationService.onNotifications
    .pipe(takeUntil(this._unsubscribeAll),filter(m=> m!=null))
    .subscribe(async (m: INotification[]) => {

      this.noticeTypes = [];

      if(m.length > 0){
        // add 'add' first.
        this.noticeTypes.push({id: 'all', title: 'All', data: null});
      }

      const gidList = {}; // gid 리스트를 담는다.
      m.forEach(item => {

        // noticeTypes 에 각각 type 별 data로 배열을 복사해둔다.
        // 필터링 시 사용
        this.tempMakeTypeFilter(item, item.data.type, this.noticeTypes);

        gidList[item.data.gid] = true;

      });

      // make gid filter list
      if(Object.keys(gidList).length > 1){
        // gid has more than 2
        const promiseMap =  Object.keys(gidList).map( async (gid: string)=> {
          return new Promise<ICustomMenu>(resolve => {
            this.cacheService.getObserver(Commons.groupPath(gid))
                .pipe(take(1))
                .subscribe((groupValue: IBizGroupData) => {
                  if(groupValue === null) {
                    resolve({ id: gid, title: 'Deleted Group' })
                  } else {
                    resolve({ id: gid, title: groupValue.team_name, data: groupValue })
                  }
                });
          });
        });
        this.noticeGidFilter = await Promise.all(promiseMap);
      }

      // save original list and
      // trigger original list arrived
      this.originalList$.next(m);

    });
  }

  onAccept(msg: INotification) {
    this.notificationService.acceptInvitation(msg.data).then(() => {

      //해당 디비와 관련된 웹으로 점프.
      this.tokenService.notifyWebJump(msg);

      if(msg.ref) {
        msg.ref.delete()
      }
    })
  }

  async onDeleteFinished(){

    const popover = await this.popoverCtrl.create({
      component: WarnPopoverComponent,
      componentProps: {
        title:this.langPack['alarm_read_delete_title'],
        description:this.langPack['alarm_read_delete_desc']
      },
      cssClass: 'warn-popover'
    });

    popover.onDidDismiss().then(async (ok) => {
      if(ok) {
        const done = this.messages.filter(m => m.data.statusInfo.done === true);
        if(done.length > 0) {
          const batch = this.bizFire.afStore.firestore.batch();
          done.forEach(m => {
            //return this.noticeService.deleteNotification(m);
            const ref = this.bizFire.afStore.firestore.collection(Commons.notificationPath(this.bizFire.currentUID)).doc(m.mid);
            batch.delete(ref);
          });

          batch.commit().then(()=>{
            this.hasFinished = this.messages.filter(m => m.data.statusInfo.done === true).length > 0;
          });
        }
      }
    });

    return await popover.present();
  }

  async onDeleteAll() {
    const popover = await this.popoverCtrl.create({
      component: WarnPopoverComponent,
      componentProps: {
        title:this.langPack['alarm_delete_all_title'],
        description:this.langPack['alarm_delete_all_desc']
      },
      cssClass: 'warn-popover'
    });

    popover.onDidDismiss().then(async (ok) => {
      if(ok === true) {
        const batch = this.bizFire.afStore.firestore.batch();
        this.messages.forEach(msg => {
          const ref = this.bizFire.afStore.firestore.collection(Commons.notificationPath(this.bizFire.currentUID)).doc(msg.mid);
          batch.delete(ref);
        });
        batch.commit().then(()=>{
          this.hasFinished = this.messages.filter(m => m.data.statusInfo.done === true).length > 0;
        }).catch(e => console.error(e));
      }
    });
    return await popover.present();
  }

  selectTypeSelected(type: string) {
    const typeFilter : ICustomMenu = {id : type,title: ''};
    console.log(typeFilter);
    this.filterNoticeType$.next(typeFilter);
  }

  protected tempMakeTypeFilter(item: INotificationItem, type: string, noticeTypes: ICustomMenu[]){
    const index = noticeTypes.findIndex(item => item.id === type);
    if(index === -1){
      noticeTypes.push({
        id: type,
        title: type, // 대문자로?
        data:[item]
      });
    } else {
      noticeTypes[index].data.push(item);
    }
  }

  back() {
    this.router.navigate([`/${this.configService.firebaseName}/tabs/home`]);
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }
}
