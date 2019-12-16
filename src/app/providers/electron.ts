import { Injectable } from '@angular/core';
import { ipcRenderer, webFrame, remote } from 'electron';
import * as childProcess from 'child_process';
import * as fs from 'fs';

@Injectable()
export class Electron {

    ipcRenderer: typeof ipcRenderer;
    webFrame: typeof webFrame;
    remote: typeof remote;
    childProcess: typeof childProcess;
    fs: typeof fs;

    // electron 에서 a링크 사용하기 위한..
    ipc : any;
    onlineStatus : boolean = true;
    opacity = 0;

    get isElectron(): boolean {
        return window && (window as any).process && (window as any).process.type;
    }

    constructor() {

        // Conditional imports
        // angula 6 부터 fs 에러가 발생. 아래와같이 코드 수정.
        if (this.isElectron) {
            this.ipcRenderer = (window as any).require('electron').ipcRenderer;
            this.webFrame = (window as any).require('electron').webFrame;
            this.remote = (window as any).require('electron').remote;

            this.childProcess = (window as any).require('child_process');
            this.fs = (window as any).require('fs');
        }
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

    setAppBadge(count){
        // macOS에서만 적용
        this.remote.app.setBadgeCount(count);

        // windows를 위한 프레임 깜빡임 이펙트
        this.ipcRenderer.send('windowsFlashFrame',count);
    }

    notification() {
        this.ipcRenderer.send('notification');
    }

    openChatRoom(ChatRoom,dbName : string) {
        const data = {chat : ChatRoom, db: dbName};
        this.ipcRenderer.send('createChatRoom',data);
    }

    resetValue(){
        // signOut할 경우 정상적으로 로그인페이지가 표시되도록 하기 위함.
        this.ipcRenderer.send('resetValue');
    }

    goLink(url){
        this.ipcRenderer.send('loadGH',url);
    }

    saveLocalUser(id:string,pwd:any,auto:boolean,company:string) {
        const data = {id:id,pwd:pwd,auto:auto,company:company};
        this.ipcRenderer.send('saveLocalUser',data);
    }
}
