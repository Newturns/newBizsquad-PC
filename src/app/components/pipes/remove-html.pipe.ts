import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'removeHtmlTag'
})
export class RemoveHtmlPipe implements PipeTransform {

  transform(text: any, ...args: any[]): any {

    let ret: string;
    if(text != null && text.length > 0){
      // remove tags.
      ret = text.replace(/<[^>]+>/gm, '');
    }
    return ret;
  }

}
