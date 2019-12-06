import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {BizFireService} from '../../biz-fire/biz-fire';

@Component({
  selector: 'biz-squad-filter',
  templateUrl: './squad-filter.component.html',
  styleUrls: ['./squad-filter.component.scss']
})
export class SquadFilterComponent implements OnInit {

  @Input()
  size : 'sm' | 'md' | 'lg' = 'sm';

  @Output()
  onFilter = new EventEmitter<string>();

  @Output()
  onSort = new EventEmitter<string>();

  filterButtonText : string = null;

  subcolor:string = '';

  currentSort = 'created';

  constructor(public bizFire : BizFireService) {
    this.subcolor = this.bizFire.currentBizGroup.data.team_subColor;
  }

  ngOnInit() { }

  onClickFilter(value : string) {
    this.filterButtonText = value;
    this.onFilter.emit(value);
  }

  onClickSort(value: string){
    this.currentSort = value;
    this.onSort.emit(value);
  }


}
