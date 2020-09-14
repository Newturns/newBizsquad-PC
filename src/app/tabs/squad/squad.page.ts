import { Component, OnInit } from '@angular/core';
import {BizFireService} from '../../biz-fire/biz-fire';
import {IBizGroup, IFolderItem, IUserData} from '../../_models';
import {IChat} from '../../_models/message';
import {BehaviorSubject, combineLatest, Subject} from 'rxjs';
import {SquadService} from '../../providers/squad.service';
import {Commons} from '../../biz-common/commons';
import {takeUntil} from 'rxjs/operators';
import {TokenProvider} from '../../biz-common/token';
import {ChatService} from '../../providers/chat.service';

@Component({
  selector: 'app-squad',
  templateUrl: './squad.page.html',
  styleUrls: ['./squad.page.scss'],
})
export class SquadPage implements OnInit {

  langPack = {};
  currentBizGroup : IBizGroup;
  public squadfilterValue : string = null;

  folders: Array<IFolderItem> = [];
  publicSquads: IChat[] = [];
  privateSquads: IChat[] = [];
  bookmark : IChat[] = [];

  sortSquadBy$ = new BehaviorSubject<'name'|'created'|any>('created');

  private _unsubscribeAll;

  constructor(private bizFire : BizFireService,
              private squadService : SquadService,
              private chatService : ChatService,
              public tokenService : TokenProvider) {
    this._unsubscribeAll = new Subject<any>();
  }

  ngOnInit() {

    this.bizFire.onLang.pipe(takeUntil(this._unsubscribeAll)).subscribe((l: any) => this.langPack = l.pack());

    this.bizFire.onBizGroupSelected
    .pipe(takeUntil(this._unsubscribeAll))
    .subscribe((g:IBizGroup) => this.currentBizGroup = g);

    combineLatest(this.bizFire.userData,this.chatService.squadChatList$,this.sortSquadBy$)
    .pipe(takeUntil(this._unsubscribeAll))
    .subscribe(([userData, squadList, sortSquadBy]) => {
      console.log("filterBroadCast() combineLatest start");
      console.log("squadList",squadList);
      const mySquadsFilter = squadList.filter(s => {
        if(s.data.type === 'private') {
          return s.data.memberArray.find(uid => uid === this.bizFire.uid);
        } else {
          return !this.bizFire.currentBizGroup.isGuest();
        }
      });
      this.filterBroadCast(userData, mySquadsFilter,sortSquadBy);
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
    if(publicSquads.length > 0) {
      this.publicSquads = publicSquads.sort(sorter);
      const defaultSquadIndex = this.publicSquads.findIndex(s => s.data.default === true);
      if(defaultSquadIndex !== -1) {
        const defaultSquad = publicSquads[defaultSquadIndex];
        const alter = [defaultSquad];
        this.publicSquads.splice(defaultSquadIndex, 1);
        this.publicSquads = alter.concat(this.publicSquads);
      }
    }
    if(privateSquads.length > 0) {
      this.privateSquads = privateSquads.sort(sorter);
    }
    if(bookmark.length > 0) {
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

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

}
