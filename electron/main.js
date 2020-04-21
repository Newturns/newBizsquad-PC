//보안에러 나오지않도록.. 추가
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1';

const {app,BrowserWindow,Tray,Menu,ipcMain,dialog,shell} = require('electron');
const path = require('path');
const url = require('url');

//윈도우 유저로컬별 크기 저장.
const windowStateKeeper = require('electron-window-state');
//로컬 스토리지 사용. 유저데이터 저장.
const storage = require('electron-json-storage');
//일렉트론 디폴트 메뉴
const defaultMenu = require('electron-default-menu');
//메뉴
const _menu = require('./menu');

// auto update //
const { autoUpdater } = require("electron-updater");
const logger = require('electron-log');

app.setAppUserModelId("com.bizsquad.ionic");
app.setAsDefaultProtocolClient('bizsquad');

autoUpdater.logger = logger;
autoUpdater.logger["transports"].file.level = "info";

logger.info('App starting...');

//메인 윈도우.
let mainWindow;

//채팅 윈도우들
let chatWindows = {};

//현재 만드는 채팅방(임시저장)
let selectChatRoom;
//접속한 firebase dbName 저장.

//dev tool on/off
const devMode = true;
// 트레이(최소화)상태일때의 메뉴.
let tray = null;
const trayContextMenu = Menu.buildFromTemplate([
    {
        label: 'Show',
        accelerator: 'CmdOrCtrl+S',
        click: function () {
            mainWindow.show();
        },
    },
    {
        type: 'separator',
    },
    {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        role:'quit',
    }
]);

//프로그램 중복실행 체크.
const gotTheLock = app.requestSingleInstanceLock();


function createWindow () {

    // windowStateKeeper
    let mainWindowState = windowStateKeeper({
        file: 'mainWindow.json',
        defaultWidth: 400,
        defaultHeight: 813
    });

    // Create the browser window.
    mainWindow = new BrowserWindow({
        'x': mainWindowState.x,
        'y': mainWindowState.y,
        'width': mainWindowState.width,
        'height': mainWindowState.height,
        frame: false,
        minWidth:400,
        minHeight:813,
        maxWidth:600,
        maxHeight:1024,
        titleBarStyle: 'hidden-inset',
        webPreferences: { nodeIntegration : true }
    });

    const startUrl = process.env.ELECTRON_START_URL || url.format({
        pathname: path.join(__dirname, '../www/index.html'),
        protocol: 'file:',
        slashes: true
    });

    mainWindow.loadURL(startUrl);

    mainWindowState.manage(mainWindow);

    // 개발자 도구를 엽니다.
    if(devMode) mainWindow.webContents.openDevTools();

    // 창이 닫히면 호출됩니다.
    mainWindow.on('closed', function () {
        // 윈도우 객체의 참조를 삭제합니다. 보통 멀티 윈도우 지원을 위해
        // 윈도우 객체를 배열에 저장하는 경우가 있는데 이 경우
        // 해당하는 모든 윈도우 객체의 참조를 삭제해 주어야 합니다.
        mainWindow = null;
        chatWindows = null;
    });

    mainWindow.on('focus', () => {
        Menu.setApplicationMenu(Menu.buildFromTemplate(_menu.mainMenuTemplate));
        mainWindow.flashFrame(false);
    });

    // x버튼 클릭시 작은 아이콘으로 표시.
    tray = new Tray(path.join(__dirname,'logo16.png'));
    tray.on('double-click',() => {
        mainWindow.show();
    });
    tray.setContextMenu(trayContextMenu);
    tray.on('right-click',() => {
        tray.popUpContextMenu(trayContextMenu);
    })
}

// 중복 실행 방지 gotTheLock
if(!gotTheLock) {
    app.quit();
} else {

    app.on('second-instance',(event , commandLine, workingDirectory) => {
        if(mainWindow) {
            if(mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
        }
    });

    app.on('ready', function(){
        createWindow();
    });
}


// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') app.quit()
});

app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) createWindow()
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.



//electron 에서 새로운 인터넷창을 키기 위함.
ipcMain.on('loadGH', (event, arg) => {
    shell.openExternal(arg);
});


//로그인하면 로컬스토리지에 유저데이터 저장.
ipcMain.on('saveLocalUser',(e, value) => {
    storage.set('userData', value, function(error) {
        if (error) throw error;
    });
});

//로그인페이지에서 요청시 유저데이터 불러옴.
ipcMain.on('getLocalUser',(event) => {
    storage.get('userData', function(error, data) {
        if (error) throw error;

        event.sender.send('sendUserData',data);
    });
});

ipcMain.on('createChatRoom', (event, data) => {

    const chatRoom = data;

    let chatRoomId;

    if(chatRoom.cid == null){
        // 스쿼드 채팅 일때 스쿼드의 doc id
        chatRoomId = chatRoom.sid;
    } else {
        // 개인 채팅 일떄 채팅방의 doc id
        chatRoomId = chatRoom.cid;
    }

    if(chatWindows[chatRoomId]) {

        chatWindows[chatRoomId].focus();

    } else {
        selectChatRoom = chatRoom;

        // console.log(selectChatRoom);

        // windowStateKeeper
        let chatWindowState = windowStateKeeper({
            file: `${chatRoomId}_01.json`,
            defaultWidth: 400,
            defaultHeight: 700,
        });

        chatWindows[chatRoomId] = new BrowserWindow({
            'x': chatWindowState.x,
            'y': chatWindowState.y,
            'width': chatWindowState.width,
            'height': chatWindowState.height,
            frame: false,
            minWidth:400,
            minHeight:700,
            maxWidth:800,
            maxHeight:1024,
            titleBarStyle: 'hidden-inset',
            opacity: 1,
            webPreferences: { nodeIntegration : true }
        });

        chatWindows[chatRoomId].loadURL(url.format({
            pathname: path.join(__dirname,'../www/index.html'),
            protocol: 'file:',
            slashes: true,
        }));

        const menuTemplate = Menu.buildFromTemplate([
            {
                label: "Quit",
                submenu: [
                    {
                        label: "close",
                        accelerator: process.platform === 'darwin' ? 'CmdOrCtrl+W' : 'Escape',
                        click: () => chatWindows[chatRoomId].close()
                    },
                ]},
            {
                label: "Edit",
                submenu: [
                    { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
                    { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
                    { type: "separator" },
                    { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
                    { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
                    { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
                    { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
                ]}
        ]);

        chatWindows[chatRoomId].on('focus', () => {
            Menu.setApplicationMenu(menuTemplate);
        });

        chatWindowState.manage(chatWindows[chatRoomId]);
    }

    // 개발자 도구를 엽니다. 개발완료 시 주석.
    if(devMode) {
        chatWindows[chatRoomId].webContents.openDevTools();
    }

    // 창이 닫히면 호출됩니다.
    chatWindows[chatRoomId].on('closed', () => {
        chatWindows[chatRoomId] = null;
    });
});

//로그아웃했을때 로그인페이지로 제대로 가도록..
ipcMain.on('resetValue',(e) =>{
    selectChatRoom = null;
});

//로그아웃시 활성화 되있는 채팅방 윈도우를 모두 닫음.
ipcMain.on('userLogOut',(e) => {
   chatWindows = {};
});

ipcMain.handle('test-channel',async (e,value) => {
   const result = selectChatRoom;
   return result;
});

ipcMain.on('windowsFlashFrame',(event, count) => {
    if(count > 0) {
        win.flashFrame(true);
    } else {
        win.flashFrame(false);
    }
});


autoUpdater.on('checking-for-update', function () {
    sendStatusToWindow('Checking for update...');
});

autoUpdater.on('update-available', function (info) {
    // const dialogOpts = {
    //     type: 'info',
    //     buttons: ['OK'],
    //     title: 'Application Update',
    //     message: releaseNameG,
    //     detail: 'There is a new update.\nThe installation file is being downloaded.\n',
    //     icon: path.join(__dirname, 'logo512.png'),
    //     noLink : true
    // }
    // dialog.showMessageBox(dialogOpts, (response) => {
    //     if (response === 0) autoUpdater.quitAndInstall();
    //     })
    sendStatusToWindow('Update available.');
});

autoUpdater.on('update-not-available', function (info) {
    sendStatusToWindow('Update not available.');
});
autoUpdater.on('error', function (err) {
    sendStatusToWindow('Error in auto-updater.');
});

autoUpdater.on('download-progress', function (progressObj) {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + parseInt(progressObj.percent) + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    sendStatusToWindow(log_message);
    mainWindow.webContents.send('progress',log_message);
});

autoUpdater.on('update-downloaded', (event,releaseName) => {

    sendStatusToWindow('update-downloaded');

    // git의 버전을 담습니다.
    let releaseNameG = "";
    if(releaseName){
        releaseNameG = 'The new version is installed. '+releaseName+'.';
    } else {
        releaseNameG = 'The new version is installed.';
    }

    const dialogOpts = {
        type: 'question',
        buttons: ['Restart now', 'Later'],
        title: 'Application Update',
        message: releaseNameG,
        detail: 'Do you want to restart now?',
        icon: path.join(__dirname, 'logo512.png'),
        noLink : true
    };
    dialog.showMessageBox(dialogOpts).then(result => {
        if(result.response === 0) {
            sendStatusToWindow('---- start install now quitAndInstall() ----');
            autoUpdater.quitAndInstall();
        } else {
            sendStatusToWindow('---- Later install ----');
        }
    });
});

autoUpdater.checkForUpdatesAndNotify();

// 15분마다 버전 체크 후 업데이트
setInterval(function() {
    autoUpdater.checkForUpdatesAndNotify();
}, 900000);

function sendStatusToWindow(message) {
    logger.info(message);
}

