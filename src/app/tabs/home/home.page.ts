import {Component, ElementRef, OnInit, Renderer2, ViewChild} from '@angular/core';
import {BizFireService} from '../../biz-fire/biz-fire';
import {TokenProvider} from '../../biz-common/token';
import {TakeUntil} from '../../biz-common/take-until';
import {NotificationService} from '../../core/notification.service';
import {filter, map, takeUntil} from 'rxjs/operators';
import {INotification, userLinks} from '../../_models';
import {UserStatusProvider} from '../../core/user-status';
import {Electron} from '../../providers/electron';
import {IMessage, Message} from '../../_models/message';
import {Commons} from '../../biz-common/commons';
import {IonGrid, PopoverController} from '@ionic/angular';
import {CustomLinkComponent} from '../../components/custom-link/custom-link.component';
import {Router} from '@angular/router';
import {ConfigService} from '../../config.service';
import {Subject} from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {

  getFavicons = 'https://www.google.com/s2/favicons?domain=';

  userCustomLinks: Array<userLinks> = [];

  badgeCount : number = 0;

  statusMenu : boolean = false;
  showMore : boolean = false;

  //앱스 더보기
  moreAppsMode : boolean = false;

  langPack = {};

  //최신 공지사항 4개.
  latelyNotice : IMessage[] = [];

  private _unsubscribeAll;

  constructor(public bizFire : BizFireService,
              public tokenService : TokenProvider,
              private electronService : Electron,
              private notificationService : NotificationService,
              private userStatusService : UserStatusProvider,
              private popoverCtrl : PopoverController,
              private router : Router,
              private configService : ConfigService
  ) {
    this._unsubscribeAll = new Subject<any>();
  }

  ngOnInit() {

    this.bizFire.onLang.pipe(takeUntil(this._unsubscribeAll)).subscribe((l: any) => {
      this.langPack = l.pack();
      console.log("언어팩구독.")
    });

    this.notificationService.onNotifications
        .pipe(filter(n => n != null),takeUntil(this._unsubscribeAll))
        .subscribe((msgs : INotification[]) => {
          if(msgs) {
            this.badgeCount = msgs.filter(m => {
              let ret : boolean;
              if(m.data.statusInfo.done !== true) {
                ret = true;
              } else {
                ret = false;
              }
              return ret;
            }).length;
            if(this.badgeCount > 99) this.badgeCount = 99;
          }
        });

    //앱스 불러오기.
    this.bizFire.userCustomLinks.pipe(filter(g=>g!=null),takeUntil(this._unsubscribeAll))
        .subscribe((links : userLinks[]) => {
          links.forEach(link => {
            if(link){
              const newData = link.data;
              newData['hidden'] = true;
            }
          });
          this.userCustomLinks = links.sort((a,b) => {
            if(a.data.create && b.data.create) {
              return a.data.create > b.data.create ? -1 : 1;
            } else {
              return 0;
            }
          });
        });

    //공지사항 불러오기.
    const path = Commons.bbsPath(this.bizFire.gid);
    this.bizFire.afStore.collection(path,ref => ref.orderBy('created','desc')
        .limit(4))
        .snapshotChanges()
        .pipe(takeUntil(this._unsubscribeAll),
        map((docs: any[]) => {
          return docs.map(s => new Message(s.payload.doc.id, s.payload.doc.data(), s.payload.doc.ref));
        }))
        .subscribe((noticeList: IMessage[]) => {
          this.latelyNotice = noticeList;
        });

  }


   async presentPopover(ev) {
      const popover = await this.popoverCtrl.create({
        component: CustomLinkComponent,
        animated: false,
        cssClass: ['page-customlink']
      });
      await popover.present();
   }

  clickMore() {
    this.moreAppsMode = !this.moreAppsMode;
  }

  removeLink(link) {
    this.bizFire.deleteLink(link).then(() => {
      if(this.userCustomLinks) {
        if(this.userCustomLinks.length < 9) {
          this.moreAppsMode = false;
        }
      }
    });
  }

  changedStatus(value){
    this.statusMenu = !this.statusMenu;
    if(value) this.userStatusService.statusChanged(value);
  }


  changeStatus(e) {
    this.statusMenu = !this.statusMenu;
  }

  showNotify() {
    this.router.navigate([`/${this.configService.firebaseName}/tabs/notify`], {replaceUrl: true});
  }

  showMenu() {
    this.showMore = !this.showMore;
  }


  logout() {
    this.electronService.resetValue();
    this.bizFire.signOut();
  }

  goLink(url) {
    this.electronService.goLink(url);
  }

  windowClose() {
    this.bizFire.signOut().then(() => {
      this.electronService.windowClose();
    });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }
}
