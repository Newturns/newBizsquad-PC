import {ModuleWithProviders, NgModule, NgZone, Optional, PLATFORM_ID, SkipSelf} from '@angular/core';
import { CommonModule } from '@angular/common';

import {AngularFirestoreModule, FirestoreSettingsToken} from '@angular/fire/firestore';

import {
  BizAuth, BizAuthFactory, BizFirestore, BizFirestoreFactory, BizStorage, BizStorageFactory, TaxlineAuth, TaxlineAuthFactory,
  TaxlineFirestore, TaxlineFirestoreFactory, TaxlineStorage, TaxlineStorageFactory,
} from './factory.service';
import {AngularFireAuthModule} from '@angular/fire/auth';
import {AngularFireStorageModule} from '@angular/fire/storage';
import {BizFireService} from './biz-fire';


const providers = [
  BizFireService,
  {
    provide: FirestoreSettingsToken, useValue: {}
  },
  {
    provide: BizFirestore,
    deps: [PLATFORM_ID, NgZone],
    useFactory: BizFirestoreFactory
  },
  {
    provide: TaxlineFirestore,
    deps: [PLATFORM_ID, NgZone],
    useFactory: TaxlineFirestoreFactory
  },
  {
    provide: BizAuth,
    deps: [PLATFORM_ID, NgZone],
    useFactory: BizAuthFactory
  },
  {
    provide: TaxlineAuth,
    deps: [PLATFORM_ID, NgZone],
    useFactory: TaxlineAuthFactory
  },
  {
    provide: BizStorage,
    deps: [PLATFORM_ID, NgZone],
    useFactory: BizStorageFactory
  },
  {
    provide: TaxlineStorage,
    deps: [PLATFORM_ID, NgZone],
    useFactory: TaxlineStorageFactory
  },
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    
    // AngularFireModule.initializeApp(environment.bizsquad)
    AngularFireAuthModule,
    AngularFirestoreModule,
    AngularFireStorageModule,
  ],
  providers:providers
  
})
export class BizFireModule {

  constructor(@Optional() @SkipSelf() parent: BizFireModule) {
    if(parent){
      throw new Error('BizFireModule already exist.');
    }
  }
  static forRoot(): ModuleWithProviders{
    return {
      ngModule: BizFireModule,
      providers: providers
    }
  }
}
