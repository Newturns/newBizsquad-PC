import { Component, OnInit } from '@angular/core';
import {LangService} from '../core/lang.service';
import {TakeUntil} from '../biz-common/take-until';
import {BizFireService} from '../biz-fire/biz-fire';
import {IBizGroup} from '../_models';
import {Router} from '@angular/router';
import {Electron} from '../providers/electron';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
})
export class TabsPage extends TakeUntil implements OnInit {

  langPack = {};

  group : IBizGroup;
  teamColor : string = '#324CA8';
  selectTabName : string;


  constructor(
      private lang : LangService,
      private bizFire : BizFireService,
      private router : Router,
      private electronService : Electron,) {
    super();

    // 채팅이 아닌 메인 윈도우를 우클릭으로 완전 종료시 유저상태변경하는 리스너.(파이어베이스의 유저상태);
    window.addEventListener('unload', () => {
      this.bizFire.signOut();
    });
  }

  ngOnInit() {
    this.lang.onLangMap.pipe(this.takeUntil).subscribe(l => { this.langPack = l });

    this.bizFire.onBizGroupSelected
    .pipe(this.takeUntil)
    .subscribe((group: IBizGroup)=>{
      if(group && group.data) {
        this.group = group;
        if(group.data.team_color) {
          this.teamColor = group.data.team_color;
          console.log("teamColor:",this.teamColor);
        }
      }
    });

  }

  changeTabs(e) {
    //탭을 선택하면 이벤트 발생.
    //현재 선택된 탭 이름을 가져온다 (string)
    this.selectTabName = e.tab;
    console.log("selectTabName : ",this.selectTabName);
  }

  groupSelect() {
    this.router.navigate([`/${this.bizFire.configService.firebaseName}/selector`], {replaceUrl: true});
  }

  windowMimimize() {
   this.electronService.windowMimimize();
  }

  windowHide() {
    this.electronService.windowHide();
  }
}
