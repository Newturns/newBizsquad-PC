// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,

  masterUrl: 'https://master-35042.firebaseio.com',

  bizsquad : {
    apiKey: "AIzaSyCT8GgcwWfND7kmt3ZPLwSQ2YW1MDnfhEM",
    authDomain: "bizsquad-6d1be.firebaseapp.com",
    databaseURL: "https://bizsquad-6d1be.firebaseio.com",
    projectId: "bizsquad-6d1be",
    storageBucket: "bizsquad-6d1be.appspot.com",
    messagingSenderId: "83346353069"
  },

  taxline: {
    apiKey: "AIzaSyDXseHSdM-TRJcR_OpNBH2PWERP2PRxDlk",
    authDomain: "dev-bizsquad.firebaseapp.com",
    databaseURL: "https://dev-bizsquad.firebaseio.com",
    projectId: "dev-bizsquad",
    storageBucket: "dev-bizsquad.appspot.com",
    messagingSenderId: "247168431751",
    appId: "1:247168431751:web:d57417b40da2cdc6696a22"
  },

  //일단 하드코딩.
  bizServerUri: 'https://manager.bizsquad.net:9010',
  webJumpBaseUrl: 'https://product.bizsquad.net/auth?token=',
  publicWeb : 'https://www.bizsquad.net/',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
