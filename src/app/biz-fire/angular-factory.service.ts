import {Injectable, NgZone} from '@angular/core';
import {ConfigService} from '../config.service';
import {AngularFirestore} from '@angular/fire/firestore';
import {BizAuth, BizFirebase, BizFirestore, BizStorage, TaxlineAuth, TaxlineFirestore, TaxlineStorage} from './factory.service';
import {AngularFireAuth} from '@angular/fire/auth';
import {AngularFireStorage} from '@angular/fire/storage';
import {AngularFireDatabase} from '@angular/fire/database';

@Injectable({
  providedIn: 'root'
})
export class AngularFactoryService {

  constructor(
    public _bizFirestore: BizFirestore,
    public _taxlineFirestore: TaxlineFirestore,
    public _bizAuth: BizAuth,
    public _taxlineAuth: TaxlineAuth,
    public _bizStorage: BizStorage,
    public _taxlineStorage: TaxlineStorage,
    public _bizFirebase : BizFirebase,
    private configService: ConfigService,
    ) {
    
  }

  getFirebase(): AngularFireDatabase {
    if(this.configService.firebaseName == null){
      throw new Error('this.configService.firebaseName is null.');
    }
    if(this.configService.firebaseName === 'bizsquad'){
      return this._bizFirebase;
    }
    if(this.configService.firebaseName === 'taxline'){
      return this._bizFirebase;
    }
  }
  
  
  getFirestore(): AngularFirestore {
    if(this.configService.firebaseName == null){
      throw new Error('this.configService.firebaseName is null.');
    }
    
    if(this.configService.firebaseName === 'bizsquad'){
      return this._bizFirestore;
    }
    if(this.configService.firebaseName === 'taxline'){
      return this._taxlineFirestore;
    }
    
  }
  
  getAuth(): AngularFireAuth {
    if(this.configService.firebaseName == null){
      throw new Error('this.configService.firebaseName is null.');
    }
    if(this.configService.firebaseName === 'bizsquad'){
      // console.error('returning bizsquad auth');
      return this._bizAuth;
    }
    if(this.configService.firebaseName === 'taxline'){
      // console.error('returning taxline auth');
      return this._taxlineAuth;
    }
  }
  
  
  getStorage(): AngularFireStorage {
    if(this.configService.firebaseName == null){
      throw new Error('this.configService.firebaseName is null.');
    }
    if(this.configService.firebaseName === 'bizsquad'){
      return this._bizStorage;
    }
    if(this.configService.firebaseName === 'taxline'){
      return this._taxlineStorage;
    }
  }
  
}
