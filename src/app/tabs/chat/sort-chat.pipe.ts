import { Pipe, PipeTransform } from '@angular/core';
import {Commons} from '../../biz-common/commons';
import {IChat} from '../../_models/message';

@Pipe({
  name: 'sortChat'
})
export class SortChatPipe implements PipeTransform {

  transform(squadList: any[], sortBy: string): IChat[] {
    if(squadList == null) return [];

    // default sorting
    sortBy = sortBy || 'created';
    const sorter = sortBy === 'name' ? Commons.squadSortByName : Commons.sortDataByCreated();
    squadList.sort(sorter);
    // public square up
    squadList.sort((a:IChat, b: IChat)=>{
      let ret = 0;
      if(a.data.default === true){
        ret = -1;
      }
      if(b.data.default === true){
        ret = 1;
      }
      return ret;
    });

    return squadList as IChat[];
  }

}
