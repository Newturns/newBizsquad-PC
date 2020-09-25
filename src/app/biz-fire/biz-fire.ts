import {Injectable, Optional, SkipSelf} from '@angular/core';
import * as firebase from 'firebase/app';
import {AngularFireAuth} from '@angular/fire/auth';
import {BehaviorSubject, Observable, Subscription, Subject, timer, concat, forkJoin, of} from 'rxjs';
import {filter, takeUntil, take, concatMap, endWith, concatAll, map} from 'rxjs/operators';
import {Commons, STRINGS} from '../biz-common/commons';
import {AngularFirestore, DocumentChangeAction} from '@angular/fire/firestore';
import {InitProcess} from './init-process';
import {BizGroupBuilder} from './biz-group';
import {LangService} from '../core/lang.service';
import {IBizGroup, IMetaData, IUserData, userLinks} from '../_models';
import {AngularFireStorage} from '@angular/fire/storage';
import DocumentSnapshot = firebase.firestore.DocumentSnapshot;
import {AngularFactoryService} from './angular-factory.service';
import {ConfigService} from '../config.service';
import {Router} from '@angular/router';
import {Electron} from '../providers/electron';
import {UserStatusProvider} from '../core/user-status';
import {AngularFireDatabase} from '@angular/fire/database';
import {ISquad} from '../providers/squad.service';
import {SquadBuilder} from './squad';

@Injectable({
    providedIn: 'root'
})
export class BizFireService {

    firstLogin = new BehaviorSubject<boolean>(true);

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

    // 라우터 용 util firebaseName추가.
    get firebaseRouteName(): string {
        if(this.configService.firebaseName == null){
            throw new Error('this.configService.firebaseName is empty.');
        }
        return `${this.configService.firebaseName}`;
    }

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

    onBizGroupChanged$ = new BehaviorSubject<string>(null);

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
    get afBase(): AngularFireDatabase {
        return this.angularFactoryService.getFirebase();
    }

    // authState 감시.
    private authStateSub: Subscription;

    public get authState(): Observable<any> {
        return this.afAuth.authState;
    }


    // util func
    get fireFunc(): string{
        return this.configService.metaData && this.configService.metaData.fireFunc;
    }

    get userDataValue(): any {
        return this.userDataSubject.getValue();
    }

    constructor(
        @Optional() @SkipSelf() parent: BizFireService,
        // public afAuth: AngularFireAuth,
        // public afStore: AngularFirestore,
        //   public afStorage: AngularFireStorage,
        private angularFactoryService: AngularFactoryService,
        private _lang: LangService,
        public configService: ConfigService,
        private router : Router,
        private electronService : Electron,
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
            this.userDataDoc = null;
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
            console.log("onbizgroupSelected() in bizfire :");
            this.loadUserData(g.gid);
        });


        // v2
        // - wait till new user logFin or change his code, broadcast LangService to child.
        // - deprecated. Use LangService.onLangMap()
        this._lang.onLangMap.subscribe( (totalLanguageMap: any) => {
            // resolved when load lang.ts finished.
            this._onLang.next(this._lang);
        });

        //숙제.
        // const testob = of(this.configService.firebaseName$,this.authState,this.currentUser);
        // testob.pipe(concatAll()).subscribe((val) => {
        //    console.log(val);
        // });

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

                        if(user) {

                            if(this._userCustomLinks == null) {
                                this.getCustomLinks(user.uid);
                            }

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

                            // ------------------------------------------------------------------
                            // * update user info.
                            // ------------------------------------------------------------------
                            const initProcess = new InitProcess(this.afStore);
                            await initProcess.start(user);

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

        //electron chat windows clear
        this.electronService.clearChatWindows();

        this.currentBizGroup = null;
        this._onBizGroupSelected.next(null);
        this._currentUser.next(null);

        console.log("logout Clear1",this.userDataDocSub);

        if(this.userDataDocSub){
            this.userDataDocSub.unsubscribe();
            this.userDataDocSub = null;
        }
        console.log("logout Clear2",this.userDataDocSub);

        // unsubscribe old one for UserData
        if(this.currentUserSubscription != null){
            this.currentUserSubscription.unsubscribe();
            this.currentUserSubscription = null;
        }


        if(this.authStateSub){
            this.authStateSub.unsubscribe();
            this.authStateSub = null;
        }

    }

    //----------------------------------------------//
    // userData 를 재로딩.
    //----------------------------------------------//
    private loadUserData(gid: string){
        const userDataPath = Commons.userDataPath(gid, this.uid);
        let reload = true;
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
                this.userDataDoc = null;
                this.userDataSubject.next('init');
            }
        }
        if(reload){ // reload => true
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

        console.log("reload values",reload);
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

                        this.onBizGroupChanged$.next(group.gid);
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
            this.afBase.database.goOnline();
            return user.user;
        } catch (e) {
            console.error(e);
            throw e;
        }
    }

    async signOut(){

        console.log('BizFireService.signOut()');

        // delete current info
        this.clear();

        this.afBase.database.goOffline();


        this.onUserSignOut.next(true);
        this.firstLogin.next(false);


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

    async updateProfile(data: any){
        return this.afAuth.auth.currentUser.updateProfile(data);
    }

    async editUserProfile(editData) {
        if(editData){
            return this.afStore.doc(`users/${this.currentUID}`).set({
                displayName : editData.displayName,
                phoneNumber : editData.phoneNumber,
                user_visible_firstname : editData.user_visible_firstname,
                user_visible_lastname : editData.user_visible_lastname,
            }, {merge: true})
        }
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

    // -- 2020.09.04 모든 프라이빗 스쿼드를 리턴한다. 부모/자식이 혼재되어 배열로 리턴된다 ---
    // 부모-자식 정렬은 따로 해야한다
    privateSquads$(gid: string, uid?: string): Observable<DocumentChangeAction<any>[]> {
        return this.afStore.collectionGroup('squads', ref =>
            ref.where('status', '==', true)
                .where('type', '==', 'private')
                .where(STRINGS.MEMBER_ARRAY, 'array-contains', uid || this.uid)
                .where('gid', '==', gid)
        ).stateChanges();
    }

    publicSquads$(gid: string): Observable<DocumentChangeAction<any>[]> {
        return this.afStore.collectionGroup('squads', ref =>
            ref.where('status', '==', true)
                .where('type', '==', 'public')
                .where('gid', '==', gid)
        ).stateChanges();
    }

    wellDoneAgileSquad$(gid: string): Observable<ISquad[]>{
        return this.afStore.collectionGroup(`squads`, ref=>
            ref.where('status', '==', false)
                .where('type', '==', 'private') // 웰던은 프라이빗만 가능하다 (제네럴은 웰던 기능이없으므로 결과는 애자일만)
                .where(STRINGS.MEMBER_ARRAY, 'array-contains',this.uid)
                .where('gid', '==', gid)
        ).snapshotChanges()
            .pipe(
                map((changes: DocumentChangeAction<any>[])=>
                        changes.map((c: DocumentChangeAction<any>)=>SquadBuilder.buildFromDoc(c.payload.doc, this.uid)
                        ),
                    // 웰던은 해당 스쿼드의 매니저에게만 보인다.
                    map((list: ISquad[])=> list.filter(s => s.isManager()))
                ),
            );
    }

}
