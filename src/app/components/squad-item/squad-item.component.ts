import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {TakeUntil} from "../../biz-common/take-until";
import {ISquad, SquadService} from "../../providers/squad.service";
import {IBizGroup} from "../../_models";
import {COLORS} from "../../biz-common/colors";
import {IChat} from "../../_models/message";
import {BizFireService} from '../../biz-fire/biz-fire';

@Component({
  selector: 'biz-squad-item',
  templateUrl: './squad-item.component.html',
  styleUrls: ['./squad-item.component.scss']
})

export class SquadItemComponent extends TakeUntil implements OnInit {

  squadBox: IChat;

  memberCount;

  langPack = {};

  @Input()
  set squad(s: IChat){
    this.loadSquad(s);
  }

  @Input()
  star:boolean = false;

  //잠금?인지아닌
  @Input()
  lockFlg: boolean;
  //스쿼드 아이템이 선택됐을 때 css를 변경한다.



  //박스내에 자물쇠, 코멘트 등의 이벤트가 필요할 때 쓰도록 한다.
  // @Input()
  // func:[]

  group: IBizGroup;
  team_color ;


  @Output()
  clickedFunc = new EventEmitter<any>();

  squadSelected:boolean = false;

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

  private loadSquad(s: IChat){
    if(s != null){
      this.squadBox = s;
      this.memberCount = s.isPublic() ? Object.keys(this.bizFire.currentBizGroup.data.members).length : s.getMemberCount();
    }
  }

  onFavoritesSelect(e){
    e.stopPropagation();
    console.log('onFavoritesSelect !!',this.squadBox);

    this.squadService.setFavorite(this.squadBox.cid, !this.star);
  }

  getSquadTitle(): string {
    let squadName;
    // 이전 DB 지원용. 'All' 스쿼드
    if(this.squadBox.data.default === true){
      squadName = this.langPack['default_squad'];
    } else {
      squadName = this.squadBox.data.title || this.squadBox.data.name;
    }
    return squadName;
  }
}
