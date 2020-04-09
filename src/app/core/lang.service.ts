import { Injectable } from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {filter, take} from 'rxjs/operators';

import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class LangService {

    // database saved data
    private originalLangData$ = new BehaviorSubject<any>(null);
    private countryCode = 'en';

    // 현재 선택된 언어만 저장 패키지.
    private filteredLangMap = {};

    //v2
    private _langObserver = new BehaviorSubject<any>(null);
    //v2 return just new map.
    get onLangMap(): Observable<any> {
        // resolve only when filteredLangMap had some value !
        return this._langObserver.asObservable().pipe(filter(f => f != null));
    }

    get lang() {
        return this.onLangMap;
    }

    langItem = {};

    constructor(private http: HttpClient) {

        // this.http.get(`${environment.masterUrl}/lang.json`)
        //     .subscribe((language: any) => {
        //         this.originalLangData$.next(language); // just save lang.ts file of from firebase
        //     });
    }


    /*
    * v2
    * - load all keys from lang.ts
    * - override old key with new one.
    * */
    loadLanguage(langCode = 'en'){

        // remove old one.
        this.filteredLangMap = {};
        this.countryCode = langCode;

        this.originalLangData$
            .pipe(take(1))
            .subscribe((langFullData: any)=>{
                // start parse
                Object.keys(langFullData)
                    .forEach(key => {
                        const pack = langFullData[key];
                        if(pack[langCode] != null){
                            this.filteredLangMap[key] = pack[langCode];
                        }
                    });
                // broadcast new map to all listeners.
                this._langObserver.next(this.filteredLangMap);
            });
    }

    get(key: string): string {
        return this.filteredLangMap[key] || key;
    }


    setLang(language: any){
        console.log("setLang::",language);
        if(language != null){
            this.originalLangData$.next(language); // just save lang.ts file of from firebase
        }
    }

    setLangItem(langItem: any){
        this.langItem = langItem;
    }

    /*
    * v2
    * - override v1 pack(string)
    * - Just exist for v1.
    * */
    pack(firstObjectKey?: string): any {
        // just return map.
        return this.filteredLangMap;
    }
}

