import {
  Component, ContentChild, ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output
} from '@angular/core';
import {TakeUntil} from "../../biz-common/take-until";
import {IUser, IUserData} from "../../_models";
import {BizFireService} from '../../biz-fire/biz-fire';
import {CacheService} from '../../core/cache/cache';

@Component({
  selector: 'app-avatar-button',
  templateUrl: './avatar-button.component.html',
  styleUrls: ['./avatar-button.component.scss'],
})
export class AvatarButtonComponent extends TakeUntil implements OnInit {


  //default size = 40px;
  @Input()
  size: 20 | 30 | 32 | 36 | 40 | 64 | 80 = 40;

  @Input()
  displayNameOn = false;

  @Input()
  set uid(uid: string){
    if(uid){
      this.setUserData(uid, null);
    }
  }

  @Input()
  set user(user: IUser) {
    if (user != null) {
      this.setUserData(user.uid, user.data);
    }
  }

  get padding(): string {
    return this._padding;
  }

  @Input()
  set padding(value: string) {
    if(value && value.indexOf('px') === -1){
      value = `${value}px`;
    }
    this._padding = value;
  }
  private _padding = null; // padding from avatar to displayName

  @Input()
  set noPadding(no: boolean){
    if(no === true){
      this._padding = null;
    }
  }

  @Input()
  textColor = '#707c97';

  @Input()
  textDecoration = 'none';

  public userData: IUserData;

  private currentUserId: string;

  @Output()
  onClick = new EventEmitter<IUserData>();

  isMyMessage = false;
  photoURL: string;
  statusColor : string;

  // padding from displayName to child ng-content
  @Input()
  childContentPadding = '0px';


  //pc 메신저 전용
  @Input()
  statusOn : boolean = false;

  @Output()
  changeStatus = new EventEmitter<boolean>();

  constructor(private bizFire: BizFireService,
              private cacheService: CacheService
  ) {
    super();
  }

  private setUserData(uid, userData: IUserData){

    this.currentUserId = uid;
    
    if(userData == null){
      // get user data from cache
      this.cacheService.userGetObserver(uid,true)
        .pipe(this.takeUntil)
        .subscribe((data: IUser) => {
          if(data != null){
            this.setUser(data.data);
          }
        });
    } else {
      this.setUser(userData);
    }
  }

  private setUser(userData: IUserData){
    this.userData = userData;
    if(userData != null){
      const photoURL = userData.photoURL;
      if(photoURL){
        this.photoURL = photoURL;
      }
      const userStatus = this.userData.onlineStatus;
      switch (userStatus) {
        case 'online':
          this.statusColor = '#32db64';
          break;
        case 'wait':
          this.statusColor = '#FEA926';
          break;
        case 'busy':
          this.statusColor = '#f53d3d';
          break;
        case 'offline':
          this.statusColor = '#C7C7C7';
          break;
        case null:
          this.statusColor = '#C7C7C7';
      }
    } else {

      // deleted user.
    }
  }


  ngOnInit() {

    if(this.displayNameOn === true && this.padding == null){
      // set to default padding
      this._padding = '8px';
    }
  }

  /*
  * AVATAR 동그라미, 유저이름 클릭시 발생
  * */
  onNameClick(){
    // this object. Not a class.
    this.onClick.emit({uid: this.currentUserId, data: this.userData} as IUser);
  }

  /*
  * 썸네일이 없을시 에러.
  * */
  onError(e){

  }

  editStatus(){
    this.changeStatus.emit(true);
  }
}
