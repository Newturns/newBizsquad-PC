import {HttpClient, HttpHeaders} from '@angular/common/http';
import { Injectable } from '@angular/core';
import {BizFireService} from '../biz-fire/biz-fire';
import {LoadingProvider} from '../providers/loading';
import {Electron} from '../providers/electron';
import {environment} from '../../environments/environment';
import {INotification} from '../_models';
import {ConfigService} from '../config.service';

@Injectable()
export class TokenProvider {

    customToken : string;

    ipc : any;

    constructor(
        private http: HttpClient,
        private electron : Electron,
        private loading: LoadingProvider,
        private configService : ConfigService,
        private bizFire:BizFireService) {
    }

    async idTokenHeader(): Promise<HttpHeaders> {
      const idToken = await this.bizFire.afAuth.auth.currentUser.getIdToken(true);
      return new HttpHeaders({
        'authorization': idToken
      });
    }

    async getToken(uid) {
      return new Promise<string>(async resolve => {
        const path = `${environment.bizServerUri}/customToken`;
        const header = await this.idTokenHeader();
        const body = {
          uid: uid
        };
        if(uid != null) {
          await this.http.post(path,body,{headers: header}).subscribe((res: any) => {
            if(res.result === true) {
              resolve(res.customToken);
            }
          })
        }
      });
    }

    async addCustomLink(uid,title,url) {
      console.log(uid,title,url);
        const path = `${environment.bizServerUri}/customLink`;
        const header = await this.idTokenHeader();
        const body = {
            uid: uid,
            title: title,
            url: url,
        };
        console.log("body :",body);
        this.http.post(path,body,{headers: header}).subscribe((res: any) => {
          console.log(res);
            // 파이어스토어에서 링크 데이터 가져오기.
        })
    }

    async makeWebJump(type: string,sid?:string) {
      const loading = await this.loading.show();
      this.getToken(this.bizFire.uid).then(async (token : string) => {
        if(type === 'setting') {
          this.electron.goLink(`${this.getWebUrl()}/auth?token=${token}&url=selector/property/${this.bizFire.gid}`);
        }
        if(type === 'bbs') {
          this.electron.goLink(`${this.getWebUrl()}/auth?token=${token}&url=${this.bizFire.gid}/notice`);
        }
        if(type === 'squad') {
          this.electron.goLink(`${this.getWebUrl()}/auth?token=${token}&url=${this.bizFire.gid}/squad/${sid}`)
        }
        if(type == 'mypage') {
          this.electron.goLink(`${this.getWebUrl()}/auth?token=${token}&url=${this.bizFire.gid}/myPage`)
        }
        if(type === 'video_chat') {
          this.electron.goLink(`${this.getWebUrl()}/auth?token=${token}&url=${this.bizFire.gid}/video`);
        }
        // 미구현 된 테스크 박스
        if(type === 'taskbox') {
          this.electron.goLink(environment.publicWeb);
        }
        await loading.dismiss();
      })
    }

    notifyWebJump(item: INotification,link?:string) {
      this.getToken(this.bizFire.uid).then((token : string) => {
        if(item.data.type === 'groupInvite') {
          this.electron.goLink(`${this.getWebUrl()}/auth?token=${token}&url=${item.data.gid}/home`);
        } else {
          const jumbUrl = `${this.getWebUrl()}/auth?token=${token}&url=${link}`;
          this.electron.goLink(jumbUrl);
        }
        //웹 점프시 알람 읽음 처리
        if(item.data.statusInfo.done !== true) {
          item.ref.update({
            statusInfo: { done: true }
          });
        }
      })
    }


    getWebUrl() : string {
      const firebaseName = this.configService.firebaseName;
      if(firebaseName) {
        if(firebaseName === 'bizsquad') {
          return `https://bizsquad.net/${firebaseName}`;
        } else {
          return `https://${firebaseName}.bizsquad.net/${firebaseName}`;
        }
      }
    }

}
