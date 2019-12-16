import { Component, OnInit } from '@angular/core';
import {ConfigService} from '../config.service';
import {BizFireService} from '../biz-fire/biz-fire';
import {Router} from '@angular/router';
import {Electron} from '../providers/electron';
import {LoadingProvider} from '../providers/loading';

@Component({
  selector: 'app-direction',
  templateUrl: './direction.page.html',
  styleUrls: ['./direction.page.scss'],
})
export class DirectionPage implements OnInit {

  constructor(private configService: ConfigService,
              private bizFire : BizFireService,
              private router : Router,
              private loading: LoadingProvider,
              private electronService : Electron) {

  }

  ngOnInit() {

    this.electronService.ipcRenderer.send('getLocalUser', 'ping');

    //채팅방 정보가 있으면 자동로그인 후 채팅프레임으로..
    this.electronService.ipcRenderer.invoke('test-channel','getChatData').then((result) => {
      if(result) {
        console.log("getChatData:",result);
        this.electronService.ipcRenderer.once('sendUserData',(e, data) => {
          console.log("getUserData : ",data);
          this.goChatFrame(data,result);
        });
      } else {
        this.router.navigate(['/login']);
      }
    });

  }

  async goChatFrame(loginData,roomData) {
    try{
      const loading = await this.loading.show();

      let companyCheckOk = false;
      companyCheckOk = await this.configService.checkCompanyName(loginData.company);

      const user = await this.bizFire.loginWithEmail(loginData.id, loginData.pwd);
      console.log(`[${this.configService.firebaseName}] ${user.email}[${user.uid}] logged in.`);

      // go to chat-frame
      await this.router.navigate([`/${this.configService.firebaseName}/chat-frame`],
          {queryParams: {gid : roomData.data.gid, cid : roomData.cid,type: roomData.data.type},replaceUrl: true});
      await loading.dismiss();

    }catch (e) {
      this.electronService.showErrorMessages("ERROR.",e.message);
      this.electronService.windowClose();
    }
  }

}
