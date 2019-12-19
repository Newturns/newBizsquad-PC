import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {BizFireService} from '../biz-fire/biz-fire';
import {ConfigService} from '../config.service';

@Injectable({
  providedIn: 'root'
})

export class UserStatusProvider {

  firebaseName : string;

  constructor(private http: HttpClient,
              private configService : ConfigService,
              private bizFire : BizFireService)
  {
    this.firebaseName = configService.firebaseName;
  }

  onUserStatusChange() {

    const firebase = this.bizFire.afBase;

    const userStatusDatabaseRef = firebase.database.ref(`/status/${this.bizFire.uid}`);
    const userStatusFirestoreRef = this.bizFire.afStore.doc(`users/${this.bizFire.uid}`);

    const isOnlineForFirestore = { onlineStatus : 'online' };
    const isOfflineForFirestore = { onlineStatus : 'offline' };

    const connectedRef = firebase.database.ref('.info/connected');

    connectedRef.on('value', (snapshot) => {

      if(this.bizFire.currentUserValue == null) {
        connectedRef.off();
      }

      // 오프라인 되었을때
      if(snapshot.val() == false) {
        userStatusFirestoreRef.set(isOfflineForFirestore,{merge : true});
        return;
      }

      const onDisconnectRef = userStatusDatabaseRef.onDisconnect();

      onDisconnectRef.set(isOfflineForFirestore)
      .then(() => {
          userStatusDatabaseRef.set(isOnlineForFirestore);
          userStatusFirestoreRef.set(isOnlineForFirestore,{merge : true});
      });
    });
  }

  windowCloseAndUserStatus() {
    return this.bizFire.afStore.doc(`users/${this.bizFire.uid}`).update({
      onlineStatus : 'offline'
    })
  }

  statusChanged(value) {
    return this.bizFire.afStore.doc(`users/${this.bizFire.uid}`).update({
      onlineStatus : value
    })
  }

}
