import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {TakeUntil} from "../../biz-common/take-until";
import {ISquad, SquadService} from '../../providers/squad.service';
import {IBizGroup} from '../../_models';
import {COLORS} from "../../biz-common/colors";
import {IChat} from "../../_models/message";
import {BizFireService} from '../../biz-fire/biz-fire';

@Component({
  selector: 'biz-squad-item',
  templateUrl: './squad-item.component.html',
  styleUrls: ['./squad-item.component.scss']
})

export class SquadItemComponent extends TakeUntil implements OnInit {

  squadBox: ISquad;

  memberCount;

  langPack = {};

  _squad: ISquad;

  @Input()
  set squad(s: ISquad){
    this._squad = s;
    this.loadSquad(s);

  }

  get isChild(): boolean {
    return this._squad && this._squad.data.parentSid != null;
  }

  get isGeneral(): boolean {
    return this._squad && this._squad.data.general === true;
  }

  @Input()
  star:boolean = false;

  //잠금?인지아닌
  @Input()
  lockFlg: boolean;
  //스쿼드 아이템이 선택됐을 때 css를 변경한다.

  @Input()
  hasChildren = false;

  //박스내에 자물쇠, 코멘트 등의 이벤트가 필요할 때 쓰도록 한다.
  // @Input()
  // func:[]

  group: IBizGroup;
  team_color ;


  @Output()
  clickedFunc = new EventEmitter<any>();

  @Output()
  subSquadShow = new EventEmitter<boolean>();

  squadSelected:boolean = false;
  _subSquadShow : boolean = false;

  constructor(private bizFire: BizFireService,
              private squadService: SquadService) {
    super();
  }

  ngOnInit() {
    this.bizFire.onBizGroupSelected
    .pipe(this.takeUntil)
    .subscribe((g: IBizGroup) => {
      this.group = g;
      this.team_color = g.data.team_color || COLORS.default;
    });

    this.bizFire.onLang
        .pipe(this.takeUntil)
        .subscribe((l: any) => this.langPack = l.pack());
  }

  private loadSquad(s: ISquad){
    if(s != null){
      this.squadBox = s;
      this.memberCount = s.isPublic() ? Object.keys(this.bizFire.currentBizGroup.data.members).length : s.getMemberCount();
    }
  }

  onFavoritesSelect(e){
    e.stopPropagation();
    console.log('onFavoritesSelect !!',this.squadBox);

    this.squadService.setFavorite(this.squadBox.sid, !this.star);
  }

  getSquadTitle(): string {
    return this.squadBox.data.default === true ?
        this.langPack['public_square'] : this.squadBox.data.title || this.squadBox.data.name;
  }

  subSquadToggle(e : any) {
    if(!this.isChild) {
      e.stopPropagation();
      this._subSquadShow = !this._subSquadShow;
      this.subSquadShow.emit(this._subSquadShow);
    }
  }

  jumpWeb() {
    this.clickedFunc.emit(this._squad.sid);
  }
}
