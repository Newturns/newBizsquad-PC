import { Injectable } from '@angular/core';
import {BizFireService} from '../biz-fire/biz-fire';

@Injectable({
  providedIn: 'root'
})

export class UserStatusProvider {

  constructor(private bizFire : BizFireService) { }

  onUserStatusChange() {

    const firebase = this.bizFire.afBase;

    const userStatusDatabaseRef = firebase.database.ref(`/status/${this.bizFire.uid}/onlineStatus`);
    const userStatusFirestoreRef = this.bizFire.afStore.doc(`users/${this.bizFire.uid}`);

    const isOnlineForFirestore = { onlineStatus : { pc : 'online' } };
    const isOfflineForFirestore = { onlineStatus : { pc : 'offline' } };

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

      onDisconnectRef.update({ pc : 'offline' })
        .then(() => {
          userStatusDatabaseRef.update({ pc : 'online' });
          userStatusFirestoreRef.set(isOnlineForFirestore,{merge : true});
        });
    });
  }

  windowCloseAndUserStatus() {
    return this.bizFire.afStore.doc(`users/${this.bizFire.uid}`).set({
      onlineStatus : { pc : 'offline' }
    },{merge : true})
  }

  statusChanged(value) {
    return this.bizFire.afStore.doc(`users/${this.bizFire.uid}`).set({
      onlineStatus : { pc : value }
    },{merge : true})
  }

}
