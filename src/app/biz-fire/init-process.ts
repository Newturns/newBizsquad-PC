
/*
InitProcess
: Process initial things.
- Get /users/<uid> info.
- Save current users' info.
- Start/Stop monitor current users' BizGroup
* */
import {AngularFirestore} from '@angular/fire/firestore';

export class InitProcess {
    
    constructor(private afStore: AngularFirestore) {
    
    }
    
    start(user: any): Promise<any> {
        
        return new Promise<any>( resolve => {
            this.afStore.collection('users').doc(`${user.uid}`).get()
              .subscribe(snap => {
                  if(snap.exists){
                      // update this user's data
                      // DB에 displayName 등이 없으면, SNS계정 값을 DB에 저장
                      const data = this.makeUpdateData(user, snap.data());
                      resolve(data);
                  } else {
                      const data = this.makeNewUserData(user);
                      snap.ref.set(data, {merge: true}).then(()=>{
                      
                          resolve(data);
                      });
                  }
              });
        });
        
        
    }
    
    private makeNewUserData(user): any {
        
        // ------------------------------------------------------------------
        // * Create new user data.
        // ------------------------------------------------------------------
        const {uid, displayName, email, photoURL, emailVerified, providerData} = user;
        const now = new Date();
        const updateNow = {
            created: now,
            lastLogin: now, // convert to timestamp
            uid: uid,
            displayName: displayName,
            email: email,
            photoURL: photoURL,
            emailVerified: emailVerified,
            providerId: providerData.map(data=>data.providerId),
            // set default data:
            status: true,
            language: 'en',
            version: 'v2'
        };
        
        console.log('makeNewUserData', updateNow);
        return updateNow;
    }
    
    private makeUpdateData(user: any, userData): any {
        
        const now = new Date();
        const {uid, displayName, email, photoURL, emailVerified, providerData} = user; //* just to dev. Do not use these datas...
        
        const updateNow = {
            lastLogin: now,
            uid: uid,
            // display name 은 없을경우에만 sns 네임을. 이후 제품에선 DB만 사용
            displayName: userData.displayName == null ? displayName: userData.displayName || null,
            email: email,
            photoURL: userData.photoURL == null ? photoURL : userData.photoURL || null,
            emailVerified: emailVerified,
            providerId: providerData.map(data=>data.providerId),
            language: userData.language || 'en' // default english
        };
        
        // console.log('update user data to', updateNow);
        return updateNow;
    }
    
}
