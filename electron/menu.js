const defaultMenu = require('electron-default-menu');
const { app,Menu,shell } = require('electron');
const mainMenuTemplate = defaultMenu(app,shell);
// Add custom menu
mainMenuTemplate.splice(2, 3,
    {
        label: 'Window',
        submenu: [{
            label: 'Close',
            accelerator: process.platform === 'darwin' ? 'CmdOrCtrl+W' : 'Escape',
            role:'hide',
        }]
    },
    {
        role: 'help',
        submenu: [
            {
                label: 'Learn More',
                click () { require('electron').shell.openExternal('https://www.bizsquad.net/user-guide/?lang=en') }
            }
        ]
    }
);

exports.mainMenuTemplate = mainMenuTemplate;
