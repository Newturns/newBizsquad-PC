import {Injectable, Optional, SkipSelf} from '@angular/core';
import * as firebase from 'firebase/app';
import {AngularFireAuth} from '@angular/fire/auth';
import {BehaviorSubject, Observable, Subscription,Subject,timer} from 'rxjs';
import {filter, takeUntil, take} from 'rxjs/operators';
import {Commons, STRINGS} from '../biz-common/commons';
import {AngularFirestore} from '@angular/fire/firestore';
import {InitProcess} from './init-process';
import {BizGroupBuilder} from './biz-group';
import {LangService} from '../core/lang.service';
import {IBizGroup, IMetaData, IUserData, userLinks} from '../_models';
import {AngularFireStorage} from '@angular/fire/storage';
import DocumentSnapshot = firebase.firestore.DocumentSnapshot;
import {AngularFactoryService} from './angular-factory.service';
import {ConfigService} from '../config.service';

@Injectable({
    providedIn: 'root'
})
export class BizFireService {

    userCustomLinks = new BehaviorSubject<userLinks[]>(null);

    get _userCustomLinks(): userLinks[] {
        return this.userCustomLinks.getValue();
    }

    onUserSignOut: Subject<boolean> = new Subject<boolean>();

    get takeUntilUserSignOut(){
        return takeUntil(this.onUserSignOut);
    }

    // ** current fireStore User
    get currentUID(): string | null {
        let ret = this.afAuth.auth.currentUser != null ? this.afAuth.auth.currentUser.uid : null;
        if(ret === null){
            const err = `currentUID requested but afAuth.auth.currentUser is ${this.afAuth.auth.currentUser}`;
            throw new Error(err);
        }
        return ret;
    }
    // add util
    get uid(): string | null {
        return this.currentUID;
    }

    //------------------------------------------------------------//
    // MetaData
    // '/metaData' collection, 'server' 도큐먼트 리턴
    //------------------------------------------------------------//
    get metaData$(): Observable<IMetaData> {
        return new Observable<IMetaData>( observer => {
            if(this._metaData){
                observer.next(this._metaData);
                observer.complete();
            } else {
                this.afStore.doc(`${STRINGS.METADATA}/server`).get().subscribe(snap => {
                    this._metaData = snap.data();
                    if(this._metaData.databaseUrl != null){
                        // get data from database url
                        // :here
                    }
                    observer.next(this._metaData);
                    observer.complete();
                }, error => {
                    console.error(error);
                    observer.error(error);
                    observer.complete();
                });
            }
        });
    }
    private _metaData: IMetaData;

    //------------------------------------------------------------//
    // User custom data with group gid //
    //------------------------------------------------------------//
    private userDataDoc: DocumentSnapshot;
    private userDataDocSub: Subscription;
    private userDataSubject = new BehaviorSubject<any>(null);
    get userData(): Observable<any> {
        return this.userDataSubject.asObservable().pipe(filter(d => d != null));
    }
    get userDataRef(): any{
        return this.userDataDoc && this.userDataDoc.ref;
    }
    //------------------------------------------------------------//

    // * Firestore data + auth.currentUser data.*
    private currentUserSubscription: Subscription;
    private _currentUser = new BehaviorSubject<IUserData>(null);
    get currentUser(): Observable<IUserData>{
        return this._currentUser.asObservable().pipe(filter(u=>u!=null));
    }
    get currentUserValue(): IUserData {
        return this._currentUser.getValue();
    }
    promiseCurrentUser(): Promise<IUserData>{
        return new Promise<IUserData>( resolve => {
            this.currentUser.pipe(take(1)).subscribe(userData=>{
                resolve(userData);
            });
        });
    }


    protected _onBizGroupSelected = new BehaviorSubject<IBizGroup>(null);
    get onBizGroupSelected():Observable<IBizGroup>{
        return this._onBizGroupSelected.asObservable().pipe(filter(g => g!= null));
    }

    onBizGroupChanged$ = new Subject<any>();

    currentBizGroup: IBizGroup;
    // util func
    get gid(): string{
        return this.currentBizGroup && this.currentBizGroup.gid;
    }
    setSelectBizGroup(group: IBizGroup): void {
        this.currentBizGroup = group;
        this._onBizGroupSelected.next(group);
    }

    private groupSub: Subscription;

    _onLang = new BehaviorSubject<LangService>(null);
    get onLang(): Observable<LangService>{
        return this._onLang.asObservable().pipe(
            filter(g => g!=null )
        );
    }

    get afStore(): AngularFirestore {
        return this.angularFactoryService.getFirestore();
    }
    // afAuth 는 프라이빗으로 선언.
    get afAuth(): AngularFireAuth {
        return this.angularFactoryService.getAuth();
    }
    get afStorage(): AngularFireStorage {
        return this.angularFactoryService.getStorage();
    }

    // authState 감시.
    private authStateSub: Subscription;

    public get authState(): Observable<any> {
        return this.afAuth.authState;
    }

    constructor(
        @Optional() @SkipSelf() parent: BizFireService,
        // public afAuth: AngularFireAuth,
        // public afStore: AngularFirestore,
        //   public afStorage: AngularFireStorage,
        private angularFactoryService: AngularFactoryService,
        private _lang: LangService,
        public configService: ConfigService,


    ) {

        console.error('bizFire created.');

        if (parent){
            throw new Error('BizFireService must one and only.');
        }

        /*
        * call this when before bizgroup going to change.
        * */
        this.onBizGroupChanged$.subscribe(()=>{
            // clean old data
            if(this.userDataDocSub){
                this.userDataDocSub.unsubscribe();
                this.userDataDocSub = null;
            }
            this.setSelectBizGroup(null);
        });

        /*
        * Every Group changes, load /bizgroup/<gid>/userData/<uid>/ data
        * */
        this.onBizGroupSelected
            .pipe(filter(g => g!=null))
            .subscribe((g: IBizGroup)=> {

                let reload = true;
                const userDataPath = Commons.userDataPath(g.gid, this.uid);
                if(this.userDataDoc){
                    // is group changed?
                    if(userDataPath === this.userDataDoc.ref.path){
                        reload = false;
                    } else {
                        // clean old data
                        if(this.userDataDocSub){
                            this.userDataDocSub.unsubscribe();
                            this.userDataDocSub = null;
                        }
                    }
                }
                if(reload){
                    this.userDataDocSub = this.afStore.doc(userDataPath)
                        .snapshotChanges()
                        .pipe(this.takeUntilUserSignOut)
                        .subscribe( (snap: any)=>{
                            const doc: DocumentSnapshot = snap.payload;
                            if(!doc.exists){
                                // save new doc.
                                doc.ref.set({
                                    uid: this.uid
                                }, {merge: true});
                            } else {
                                this.userDataDoc = doc;
                                this.userDataSubject.next(doc.data());
                            }
                        });
                }
            });


        // v2
        // - wait till new user login or change his code, broadcast LangService to child.
        // - deprecated. Use LangService.onLangMap()
        this._lang.onLangMap.subscribe( (totalLanguageMap: any) => {
            // resolved when load lang.ts finished.
            this._onLang.next(this._lang);
        });

        /*
        * 멀티 디비 추가.
        * */
        this.configService.firebaseName$
            .subscribe((firebaseName: string)=>{

                if(firebaseName != null && this.authStateSub == null){

                    this.authStateSub = this.afAuth.authState.subscribe(async (user: firebase.User | null) => {

                        console.log(`authState [${this.configService.firebaseName}][${user != null ? user.uid: user}]`);

                        // unsubscribe old one for UserData
                        if(this.currentUserSubscription != null){
                            this.currentUserSubscription.unsubscribe();
                            this.currentUserSubscription = null;
                        }

                        if(user){


                            if(this._userCustomLinks == null) {
                                this.getCustomLinks(user.uid);
                            }

                            // ------------------------------------------------------------------
                            // * update user info.
                            // ------------------------------------------------------------------
                            const initProcess = new InitProcess(this.afStore);
                            await initProcess.start(user);

                            // start trigger after update login date.
                            this.currentUserSubscription = this.afStore.doc(Commons.userPath(user.uid))
                                .valueChanges()
                                .pipe(
                                    takeUntil(this.onUserSignOut)
                                    ,filter(u=>u!= null)
                                )
                                .subscribe((snapshot: any) => {

                                    const userData = snapshot;
                                    console.log('currentUser data', userData, 'loaded');

                                    // load language file with current user's code
                                    this._lang.loadLanguage(userData.language); // resolve onLangMap()

                                    // multicast current user.
                                    this._currentUser.next(userData as IUserData);
                                });

                        } else {

                            // clear current users' data
                            if(this._currentUser.getValue() != null){
                                this._currentUser.next(null);
                            }
                        }

                    });
                }

            });


    }

    /*
    * Clear()
    * clear current user, group data.
    * */
    private clear(){

        // unsubscribe old one for UserData
        if(this.currentUserSubscription != null){
            this.currentUserSubscription.unsubscribe();
            this.currentUserSubscription = null;
        }

        this.currentBizGroup = null;
        this._onBizGroupSelected.next(null);
        this._currentUser.next(null);

        if(this.authStateSub){
            this.authStateSub.unsubscribe();
            this.authStateSub = null;
        }

    }


    //--------------------------------------------------------------------//
    // LoadBizGroup
    //--------------------------------------------------------------------//
    loadBizGroup(gid: string) : Promise<IBizGroup>{

        return new Promise<IBizGroup>( (resolve, reject) => {
            // check old group
            if(this.currentBizGroup){
                if(this.currentBizGroup.gid === gid){
                    // same group already loaded.
                    // just return Observer and do nothing.
                    resolve(this.currentBizGroup);
                    return;
                }
            }

            console.log(`loadBizGroup [${gid}]`);

            // group home have changed.
            // delete old datas.
            if(this.groupSub){
                this.groupSub.unsubscribe();
                this.groupSub = null;
            }

            // find current biz group
            const path = `${STRINGS.STRING_BIZGROUPS}/${gid}`;
            this.groupSub = this.afStore.doc(path)
                .valueChanges()
                .pipe(
                    this.takeUntilUserSignOut
                )
                .subscribe((data: any)=>{

                    if(data && data['status'] === true){

                        const group: IBizGroup = BizGroupBuilder.buildWithData(gid, data, this.uid);

                        this.onBizGroupChanged$.next({old: this.currentBizGroup, new: group});
                        this.currentBizGroup = group;
                        this._onBizGroupSelected.next(group);

                        // save MOBILE last login group
                        if(this.currentUserValue.lastPcGid !== group.gid){
                            this.afStore.collection(STRINGS.USERS).doc(this.uid).update({
                                lastPcGid: group.gid
                            }).then(()=>{
                                resolve(this.currentBizGroup);
                            });
                        } else {
                            resolve(this.currentBizGroup);
                        }

                    } else {

                        //-------------------------------------------------//
                        // loadGroup() called with no existing GID
                        //-------------------------------------------------//
                        // group deleted?
                        console.error(`BizGroup [${gid}] not exist for user [${this.uid}]. Or status is false.`);
                        this.currentBizGroup = null;
                        this._onBizGroupSelected.next(null);

                        // delete sub?
                        this.groupSub.unsubscribe();
                        this.groupSub = null;

                        //-------------------------------------------------//
                        // delete lastGetGid and go to selector
                        //-------------------------------------------------//
                        console.error('Delete lastPcGid, lastWebGid,lastMobileGid');
                        this.afStore.doc(Commons.userPath(this.uid)).update({
                            lastWebGid: null,
                            lastMobileGid: null,
                            lastPcGid: null,
                        }).then(()=> {
                            reject();
                        });
                    }
                });
        });

    }




    //--------------------------------------------------------------------//
    // Sign In
    //--------------------------------------------------------------------//
    async loginWithEmail(email: string, password: string): Promise<firebase.User> {
        try {
            await this.afAuth.auth.setPersistence(firebase.auth.Auth.Persistence.NONE);
            const user = await this.afAuth.auth.signInWithEmailAndPassword(email, password);
            return user.user;
        } catch (e) {
            console.error(e);
            throw e;
        }
    }

    async signOut(){

        console.log('BizFireService.signOut()');

        timer(0).subscribe(()=>this.onUserSignOut.next(true));

        // delete current info
        this.clear();

        // unsubscribe old one for UserData
        // * called ONLY user signed Out from signIn.
        await this.afAuth.auth.signOut();

        // added. Clear ConfigService data for no db is used.
        // * MUST call AFTER afAuth.auth.signOut();
        timer(0).subscribe(()=>{
            this.configService.firebaseName = null;
            this.userCustomLinks.next(null);
        });

    }



    /*
    * return IBizGroup[]
    * */
    getAllGroups(uid?: string) {
        return new Promise<IBizGroup[]>( (resolve, reject) => {
            this.afStore.collection(STRINGS.STRING_BIZGROUPS, ref => {
                let query: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
                query = query.where(new firebase.firestore.FieldPath(STRINGS.FIELD.MEMBER, uid || this.uid),'==', true);
                query = query.where('status', '==', true);
                return query;
            }).get().subscribe(async (s:any) => {
                const groups = s.docs.map( d => BizGroupBuilder.buildWithData(d.id, d.data(), uid || this.uid, d.ref));
                resolve(groups);
            });
        });
    }

    public isSignIn(): boolean{
        let ret = false;
        if (this.configService.firebaseName != null) {
            ret = this.afAuth.auth.currentUser != null;
        }
        return ret;
    }

    updateProfile(data: any){
        return this.afAuth.auth.currentUser.updateProfile(data);
    }

    getCustomLinks(uid) {
        this.afStore.collection(`users/${uid}/customlinks`)
            .snapshotChanges().pipe(takeUntil(this.onUserSignOut))
            .subscribe(snaps => {
                const links = snaps.map(snap => {
                    return {mid: snap.payload.doc.id, data: snap.payload.doc.data()} as userLinks;
                });
                this.userCustomLinks.next(links);
            });
    }
    deleteLink(link){
        return this.afStore.collection(`users/${this.currentUID}/customlinks`).doc(link.mid).delete();
    }

}
