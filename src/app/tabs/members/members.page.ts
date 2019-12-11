import { Component, OnInit } from '@angular/core';
import {BizFireService} from '../../biz-fire/biz-fire';
import {Electron} from '../../providers/electron';
import {TakeUntil} from '../../biz-common/take-until';
import {IBizGroup, IUser} from '../../_models';
import {CacheService} from '../../core/cache/cache';
import {Commons} from '../../biz-common/commons';
import {BehaviorSubject, timer} from 'rxjs';

@Component({
  selector: 'app-members',
  templateUrl: './members.page.html',
  styleUrls: ['./members.page.scss'],
})
export class MembersPage extends TakeUntil implements OnInit {

  userList$ = new BehaviorSubject<IUser[]>(null);

  serachValue : string;

  langPack = {};

  group: IBizGroup;

  constructor(private bizFire : BizFireService,
              private cacheService : CacheService,
              private electronService : Electron) {
    super();
  }

  ngOnInit() {

    this.bizFire.onLang.subscribe((l: any) => this.langPack = l.pack());

    this.bizFire.onBizGroupSelected
        .pipe(this.takeUntil)
        .subscribe((g: IBizGroup) =>{

          this.group = g;

          this.reloadUsers();
        })

  }

  private reloadUsers(){

    this.cacheService.resolvedUserList(this.group.getMemberIds(), Commons.userInfoSorter)
        .subscribe((list: IUser[]) => {
          timer(0).subscribe(()=> this.userList$.next(list));
        });
  }

  clickAvatar(user : IUser) {

  }

  goLink(url) {
    this.electronService.goLink(url);
  }

  onSearch(e) {}


}
