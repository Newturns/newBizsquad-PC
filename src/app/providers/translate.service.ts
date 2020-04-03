import {Inject, Injectable, InjectionToken} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {IMetaData} from '../_models';
import {TakeUntil} from '../biz-common/take-until';
import {BizFireService} from '../biz-fire/biz-fire';
import {STRINGS} from '../biz-common/commons';
import * as firebase from 'firebase/app';

export interface ITranslations {
  translatedText: string
  model: any,
  glossaryConfig: any,
  detectedLanguageCode?: string
}

@Injectable({
  providedIn: 'root'
})
export class TranslateService extends TakeUntil{
  
  langOptions = ['en', 'ja', 'ko'];
  
  constructor(private http: HttpClient,
              private bizFire: BizFireService
  ) {
    super();
    
  }
  
  convertToHtmlString(lang: string): string {
    let value;
    if(lang === 'en'){
      value = 'english';
    } else if(lang === 'ja'){
      value = 'japan';
    } else if(lang === 'ko'){
      value = 'korea';
    }
    return value;
  }
  
  
  translateText(text: string, target: string) {
    return this.translate(text, target, 'text/plain');
  }
  
  translateHtml(html: string, target: string){
    return this.translate(html, target, 'text/html');
  }
  
  private translate(text: string | string[], target: string, mimeType: string): Promise<ITranslations[]>{
    
    return new Promise<ITranslations[]>( (resolve, reject) => {
      /*
      * body.text, body.target은 필수.
      * */
      const body = {
        text: text, // string 배열 사용가능
        target: target, //'ko', 'ja', 'en' 등
        mimeType: mimeType
      };

      // fireFunc url needed
      const url = `${this.bizFire.fireFunc}/translate`;

      this.http.post(url, body).subscribe((res: any)=>{

        resolve(res.translations);

      }, error => {
        console.error(error);
        reject(error);
      });
    });
    
  }
}
