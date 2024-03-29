import { Injectable } from '@angular/core';
import { ipcRenderer, webFrame, remote,clipboard } from 'electron';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import {ConfigService} from '../config.service';

@Injectable()
export class Electron {

    ipcRenderer: typeof ipcRenderer;
    webFrame: typeof webFrame;
    remote: typeof remote;
    clipboard: typeof clipboard;
    childProcess: typeof childProcess;
    fs: typeof fs;

    // electron 에서 a링크 사용하기 위한..
    ipc : any;
    onlineStatus : boolean = true;
    opacity = 0;

    get isElectron(): boolean {
        return !!(window && (window as any).process && (window as any).process.type);
    }

    constructor(private configService: ConfigService,) {
        // Conditional imports
        // angula 6 부터 fs 에러가 발생. 아래와같이 코드 수정.
        if (this.isElectron) {
            this.ipcRenderer = (window as any).require('electron').ipcRenderer;
            this.webFrame = (window as any).require('electron').webFrame;
            this.remote = (window as any).require('electron').remote;
            this.clipboard = (window as any).require('electron').clipboard;
            this.childProcess = (window as any).require('child_process');
            this.fs = (window as any).require('fs');
        }

        console.log("remote",this.remote);
    }

    windowHide(){
        this.remote.getCurrentWindow().hide();
    }
    // 디폴트 상태창 숨기고 X버튼에 프로그램 종료이벤트 추가.
    // windowClose는 채팅창에서만 사용
    windowClose(){
        this.remote.getCurrentWindow().close();
    }
    windowMimimize(){
        this.remote.getCurrentWindow().minimize();
    }
    showErrorMessages(title,message){
        this.remote.dialog.showErrorBox(title,message);
    }
    setOpacity(v){
        v = v / 100;
        v = Number.parseFloat(v).toFixed(1);
        this.opacity = v * 1;
        if(this.opacity){
            this.remote.getCurrentWindow().setOpacity(this.opacity)
        }
    }

    setAppBadge(count : number){
        if(this.remote.process.platform === 'darwin') {
            // macOS에서만 적용 (뱃지카운터 표시);
            this.remote.app.badgeCount = count;
            // this.remote.app.setBadgeCount(count);
        } else {
            // windows를 위한 프레임 깜빡임 이펙트
            this.ipcRenderer.send('windowsFlashFrame',count);
        }
    }

    notification() {
        this.ipcRenderer.send('notification');
    }

    openChatRoom(chatRoom,uid) {
        if(chatRoom) {
            if(!chatRoom.fireFunc)
                chatRoom.fireFunc = this.configService.metaData.fireFunc;

            if(!chatRoom.uid)
                chatRoom.uid = uid;
        }
        console.log("openChatRoom()",chatRoom);

        this.ipcRenderer.send('createChatRoom',chatRoom);
    }

    resetValue(){
        // signOut할 경우 정상적으로 로그인페이지가 표시되도록 하기 위함.
        this.ipcRenderer.send('resetValue');
    }

    goLink(url){
        this.ipcRenderer.send('loadGH',url);
    }

    saveLocalUser(id:string,pwd:any,auto:boolean,company:string,uid:string) {
        const data = {id:id,pwd:pwd,auto:auto,company:company,uid:uid};
        this.ipcRenderer.send('saveLocalUser',data);
    }

    clearChatWindows() {
        this.ipcRenderer.send('userLogOut');
    }

    clipboardHasImg() : boolean {
        const availableFormats = this.clipboard.availableFormats("clipboard");
        return availableFormats.includes("image/png") || availableFormats.includes("image/jpeg");
    }

    getClipboardImg() : File {
        const clipboardImg = this.clipboard.readImage("clipboard");
        const filetoPNG = clipboardImg.toPNG();
        const fileName = `clipboard_${new Date().getTime()}.png`;
        return new File([filetoPNG],fileName,{type: "image/png"});
    }

    getClipboardImg64() {
        //이미지를 최대한 가볍게 만들어 ctrl+v시 딜레이시간을 최소화.
        const clipboardImg = this.clipboard.readImage("clipboard").resize({width : 300,quality : 'good'});
        return clipboardImg.toDataURL();
    }



    mouseRightClick() {
    }
}
