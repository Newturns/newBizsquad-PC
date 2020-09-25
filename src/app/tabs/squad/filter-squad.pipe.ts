import { Pipe, PipeTransform } from '@angular/core';
import {ISquad} from '../../providers/squad.service';
@Pipe({
  name: 'filterSquad'
})
export class FilterSquadPipe implements PipeTransform {

  transform(value: ISquad[], filterFunc: (s: ISquad)=>boolean, ...args: unknown[]): ISquad[] {
    if(value == null || value.length === 0) return [];
    if(filterFunc == null) return value;

    return value.filter((s: ISquad)=> filterFunc(s) );

  }


}
