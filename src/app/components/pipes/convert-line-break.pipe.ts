import { Pipe, PipeTransform } from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';

@Pipe({
  name: 'convertLineBreak'
})
export class ConvertLineBreakPipe implements PipeTransform {

  constructor(private _domSanitizer: DomSanitizer) {}

  transform(value: any, args?: any): any {
    return this.convertLineBreak(value);
  }

  //기존 메세지 호환용 파이프 - 이전사양에서 채팅에 <p>태그와 <br>태그를 넣었으므로 ..
  convertLineBreak(value: any): any {
    if(value && value.length > 0) {
      // change '<br>' to \n
      value = value.replace(/<br\s*[\/]?>/gi, '\n');
    }
    return value;
  }
}
