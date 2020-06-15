import { Component, OnInit } from '@angular/core';
import {BizFireService} from '../../biz-fire/biz-fire';
import {Electron} from '../../providers/electron';
import {IBizGroup, IUser} from '../../_models';
import {CacheService} from '../../core/cache/cache';
import { Observable, Subject } from 'rxjs';
import {PopoverController} from '@ionic/angular';
import {ProfilePopoverComponent} from '../../components/profile-popover/profile-popover.component';
import {filter, takeUntil} from 'rxjs/operators';

@Component({
  selector: 'app-members',
  templateUrl: './members.page.html',
  styleUrls: ['./members.page.scss'],
})

export class MembersPage implements OnInit {

  filteredUserList: string[] = null;

  langPack = {};

  group: IBizGroup;

  searchKeyword = '';

  private _unsubscribeAll;

  constructor(private bizFire : BizFireService,
              private cacheService : CacheService,
              private electronService : Electron,
              private popoverCtrl : PopoverController) {

    this._unsubscribeAll = new Subject<any>();
  }

  ngOnInit() {

    this.bizFire.onLang.pipe(takeUntil(this._unsubscribeAll)).subscribe((l: any) => this.langPack = l.pack());

    this.bizFire.onBizGroupSelected
    .pipe(filter(g=>g!=null),takeUntil(this._unsubscribeAll))
    .subscribe((group:IBizGroup) => {
      this.group = group;

      if(this.filteredUserList === null) {
        this.filteredUserList = this.group.getMemberIds(true);
      } else {
        if(this.filteredUserList.length !== group.getMemberIds().length) {
          this.filteredUserList = this.group.getMemberIds(true);
        }
      }
    });

  }

  getUserObserver(uid: string): Observable<IUser>{
    return this.cacheService.userGetObserver(uid,true);
  }

  async presentPopover(user : IUser) {
    const popover = await this.popoverCtrl.create({
      component: ProfilePopoverComponent,
      animated: false,
      componentProps : {user : user},
      cssClass: ['page-profile']
    });
    await popover.present();
  }

  goLink(url) {
    this.electronService.goLink(url);
  }

  onSearch(e) {
      const value = e.target.value;
      this.searchKeyword = value;
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }
}
