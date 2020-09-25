import { Pipe, PipeTransform } from '@angular/core';
import {Commons} from '../../biz-common/commons';
import {ISquad} from '../../providers/squad.service';

@Pipe({
  name: 'sortSquad'
})
export class SortSquadPipe implements PipeTransform {

  transform(squadList: any[], sortBy: string): ISquad[] {
    if(squadList == null) return [];

    // default sorting
    sortBy = sortBy || 'created';
    const sorter = sortBy === 'name' ? Commons.squadSortByName : Commons.sortDataByCreated();
    squadList.sort(sorter);
    // public square up
    squadList.sort((a:ISquad, b: ISquad )=>{
      let ret = 0;
      if(a.data.default === true){
        ret = -1;
      }
      if(b.data.default === true){
        ret = 1;
      }
      return ret;
    });

    return squadList as ISquad[];
  }

}
