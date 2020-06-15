import {Injectable, Optional, SkipSelf} from '@angular/core';
import {CanLoad, Route, Router, UrlSegment} from '@angular/router';
import {environment} from '../environments/environment';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject} from 'rxjs';
import {IMetaData} from './_models';
import {LangService} from './core/lang.service';

@Injectable({
  providedIn: 'root'
})
export class ConfigService implements CanLoad {

  metaData: IMetaData;

  // null로 설정시, BizFire생성자에서 authState가 에러.
  private _firebaseName: string = null;
  get firebaseName(): string {
    return this._firebaseName;
  }
  set firebaseName(name: string){
    this._firebaseName = name;
    this.firebaseName$.next(this._firebaseName);
  }
  firebaseName$ = new BehaviorSubject<string>(null);
  
  constructor(@Optional() @SkipSelf() private mySelf: ConfigService,
              private http: HttpClient,
              private router: Router,
              private langService: LangService,) {
    if(mySelf){
      throw new Error('ConfigService already loaded.');
    }
  }
  
  canLoad(route: Route, segments: UrlSegment[]): Promise<boolean> {
    
    return new Promise<boolean>( (resolve, reject) => {
      
      console.log('ConfigService canLoad', segments.map(s => s.path).join('/'));
      
      let firebaseNameOfUrl;
      if(segments.length > 0){
        firebaseNameOfUrl = segments[0].path;
      }
      
      // refresh 대응.
      // URL 에서 'taxline' 을 찾아 서버에 확인한 후, 다음 라우트로 허가
      if(this.firebaseName !== firebaseNameOfUrl){
        
        if(firebaseNameOfUrl){
          
          this.checkCompanyName(firebaseNameOfUrl).then(()=>{
            resolve(true);
          }).catch(e => {
            console.error('ConfigService::canLoad firebaseNameOfUrl error.');
            console.error(e);
            // route to login
            this.router.navigate(['/login'],{replaceUrl: true});
            resolve(false);
          });
        } else {
          // segments[0] is null.
          // 주소에, db 네임 아무것나 넣고 리프레쉬중일 가능성...
          // login 화면으로 보낸다.
          console.error('ConfigService::canLoad', 'firebase name not found.');
          console.error('redirect to /login');
          this.router.navigate(['/login'],{replaceUrl: true});
          resolve(false);
        }
      } else {
        // go to next route.
        resolve(true);
      }
      
    });
    
  }
  
  checkCompanyName(company: string): Promise<any>{
    
    return new Promise<boolean>((resolve, reject) => {
      if(company == null || company.length === 0){
        reject({code: 'companyNotFound', message: 'Sorry, Company name required.'});
        return;
      }
      company = company.toLowerCase().trim();

      this.http.get(`${environment.masterUrl}/.json`)
        .subscribe( (data: any) => {
          if(data){
            const found = Object.keys(data.servers).find(value => company === value);
            if(found){
              // save
              this.firebaseName = company;
              this.metaData = data.servers[found];
              if(this.metaData.fireFunc == null){
                console.error('fireFunc url not set.');
                throw new Error('fireFunc url not set.');
              }

              /**************************************************************/
              // 20.04.08 텍스라인/비즈스쿼드 각각 다른 언어팩 로딩으로 수정.
              /**************************************************************/
              // load language
              // console.log(company);
              let lang: string;
              if(company === 'bizsquad'){
                lang = 'lang';
              }
              if(company === 'taxline'){
                lang = 'langTaxline';
              }
              this.langService.setLang(data[lang]);
              this.langService.setLangItem(data.langPack);

              resolve(true);

            } else {
              reject({message: `Sorry, Invalid company name [${company}]`, code: 'companyNotFound'});
            }
          }
        });
    });
  }
}
