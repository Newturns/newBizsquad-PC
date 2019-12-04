import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {BizFireService} from '../../biz-fire/biz-fire';

@Component({
  selector: 'biz-squad-filter',
  templateUrl: './squad-filter.component.html'
})
export class SquadFilterComponent implements OnInit {

  @Input()
  size : 'sm' | 'md' | 'lg' = 'sm';

  @Output()
  onFilter = new EventEmitter<string>();


  filterButtonText : string = null;

  subcolor:string = '';

  constructor(public bizFire : BizFireService) {
    this.subcolor = this.bizFire.currentBizGroup.data.team_subColor;
  }

  ngOnInit() { }

  onClickFilter(value : string) {
    this.filterButtonText = value;
    this.onFilter.emit(value);
  }

}
