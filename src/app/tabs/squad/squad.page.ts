import { Component, OnInit } from '@angular/core';
import {TakeUntil} from '../../biz-common/take-until';
import {BizFireService} from '../../biz-fire/biz-fire';
import {IBizGroup, IFolderItem, IUserData} from '../../_models';
import {IChat} from '../../_models/message';
import {BehaviorSubject, combineLatest, Subject} from 'rxjs';
import {SquadService} from '../../providers/squad.service';
import {Router} from '@angular/router';
import {ConfigService} from '../../config.service';
import {Commons} from '../../biz-common/commons';

@Component({
  selector: 'app-squad',
  templateUrl: './squad.page.html',
  styleUrls: ['./squad.page.scss'],
})
export class SquadPage extends TakeUntil implements OnInit {

  langPack = {};
  currentBizGroup : IBizGroup;
  public squadfilterValue : string = null;

  folders: Array<IFolderItem> = [];
  publicSquads: IChat[] = [];
  privateSquads: IChat[] = [];
  bookmark : IChat[] = [];

  sortSquadBy$ = new BehaviorSubject<'name'|'created'|any>('created');

  private userDataChanged = new Subject<IUserData>(); // userData monitor.

  constructor(private bizFire : BizFireService,
              private squadService : SquadService,
              private configService : ConfigService,
              private router : Router) {
    super();
  }

  ngOnInit() {

    this.bizFire.onLang.subscribe((l: any) => this.langPack = l.pack());

    this.bizFire.onBizGroupSelected
    .pipe(this.takeUntil)
    .subscribe((g:IBizGroup) => this.currentBizGroup = g);

    combineLatest(this.bizFire.userData, this.squadService.onSquadListChanged,this.sortSquadBy$)
    .pipe(this.takeUntil)
    .subscribe(([userData, squadList, sortSquadBy]) => {
      console.log("filterBroadCast() combineLatest start");
      this.filterBroadCast(userData, squadList,sortSquadBy);
    });
  }

  private filterBroadCast(userData: any,squadList: IChat[], sortSquadBy : string) {
    console.log("filterBroadCast() start");
    // create broad cast data

    this.folders = []; // my folders
    this.privateSquads = [];
    this.publicSquads = [];
    this.bookmark = [];

    const {folders,privateFolders,privateSquads,publicSquads,bookmark} = this.squadService.makeSquadMenuWith(userData, squadList);

    let sorter = sortSquadBy === 'name' ? Commons.squadSortByName : Commons.sortDataByCreated();
    if(publicSquads) {
      this.publicSquads = publicSquads.sort(sorter);
      const defaultSquadIndex = this.publicSquads.findIndex(s => s.data.default === true);
      if(defaultSquadIndex !== -1) {
        const defaultSquad = publicSquads[defaultSquadIndex];
        const alter = [defaultSquad];
        this.publicSquads.splice(defaultSquadIndex, 1);
        this.publicSquads = alter.concat(this.publicSquads);
      }
    }
    if(privateSquads) {
      this.privateSquads = privateSquads.sort(sorter);
    }
    if(bookmark) {
      this.bookmark = bookmark.sort(sorter);
      const defaultSquadIndex = this.publicSquads.findIndex(s => s.data.default === true);
      if(defaultSquadIndex !== -1){
        // create new array
        const defaultSquad = this.bookmark[defaultSquadIndex];
        const alter = [defaultSquad];
        this.bookmark.splice(defaultSquadIndex, 1);
        this.bookmark = alter.concat(this.bookmark);
      }
    }
  }

  onSquadTypeFilter(type: string) {
    if(type === 'name' || type === 'created'){
      this.sortSquadBy$.next(type);
    } else {
      this.squadfilterValue = type;
    }
    console.log(type);
  }

}
