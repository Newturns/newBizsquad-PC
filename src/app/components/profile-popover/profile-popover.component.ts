import { Component, OnInit } from '@angular/core';
import {FormBuilder, FormGroup, ValidatorFn, Validators} from '@angular/forms';
import {IBizGroup, IUser} from '../../_models';
import {TakeUntil} from '../../biz-common/take-until';
import {BizFireService} from '../../biz-fire/biz-fire';
import {NavParams, PopoverController, ToastController} from '@ionic/angular';
import {LoadingProvider} from '../../providers/loading';
import {ChatService} from '../../providers/chat.service';
import {IChat} from '../../_models/message';
import {Electron} from '../../providers/electron';

@Component({
  selector: 'app-profile-popover',
  templateUrl: './profile-popover.component.html',
  styleUrls: ['./profile-popover.component.scss'],
})
export class ProfilePopoverComponent extends TakeUntil implements OnInit {

  me : boolean = false;

  editProfileForm: FormGroup;

  // 변경된 값이 있는지
  checkProfile: boolean = false;
  targetValue : IUser;

  imageSrc : string = '';

  displayName: string;
  group: IBizGroup;
  attachFile: File;

  private maxFileSize = 1000000; // 1MB

  public langPack : any;


  private displayNameValidator: ValidatorFn = Validators.compose([
    Validators.required,
    Validators.maxLength(20)
  ]);
  private phoneNumberValidator: ValidatorFn = Validators.compose([
    Validators.maxLength(20)
  ]);

  constructor(private bizFire : BizFireService,
              private navParams: NavParams,
              private formBuilder: FormBuilder,
              private popoverCtrl : PopoverController,
              private toastCtrl: ToastController,
              private chatService : ChatService,
              private electronService : Electron,
              private loading : LoadingProvider) {
    super();
  }

  ngOnInit() {

    this.bizFire.onLang.subscribe((l: any) => this.langPack = l.pack());

    this.targetValue = this.navParams.get('user');
    // 본인확인
    this.me = this.bizFire.uid == this.targetValue.uid;

    this.editProfileForm = this.formBuilder.group({
      displayName: [this.targetValue.data.displayName, this.displayNameValidator],
      phoneNumber: [this.targetValue.data.phoneNumber, this.phoneNumberValidator],
      email: [this.targetValue.data.email],
      user_visible_firstname: [this.targetValue.data.user_visible_firstname || '',this.phoneNumberValidator],
      user_visible_lastname: [this.targetValue.data.user_visible_lastname || '',this.phoneNumberValidator]
    });

    this.editProfileForm.valueChanges.pipe(this.takeUntil)
    .subscribe(data => {
      this.checkProfile = true;
    })
  }


  async editPhoto(event) {
    if(event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      this.attachFile = file;

      if(this.attachFile.size > this.maxFileSize) {
        const error = `${this.langPack['error_file_size_too_big']} (max: ${this.maxFileSize/1000000}MB)`;
        this.attachFile = null;
        // error 창.
        this.presentToast(error,'danger');
      } else {
        const loading = await this.loading.show();
        try {
          const reader = new FileReader();
          reader.onload = (e: any) => this.imageSrc = e.target.result;

          reader.readAsDataURL(file);

          const url = await this.uploadProfile();

          const updateProfileData = {
            displayName: this.editProfileForm.value['displayName'],
            photoURL: url
          };

          await this.bizFire.updateProfile(updateProfileData);
          await this.bizFire.afStore.doc(`users/${this.bizFire.uid}`).update({
            displayName: this.editProfileForm.value['displayName'],
            photoURL: url,
          });

          this.attachFile = null;
          await loading.dismiss();
          await this.presentToast(this.langPack["update_success"],'success');

        } catch (e) {
          await loading.dismiss();
          await this.presentToast(this.langPack["failed_update_profile"],'success');
          // error 창.
        }
      }
    }
  }

  async uploadProfile(): Promise<string>{
    return new Promise<string>( (resolve, reject) => {
      if(this.attachFile){
        const ref = this.bizFire.afStorage.storage.ref(`users/${this.bizFire.uid}/profile.jpeg`);
        ref.put(this.attachFile).then(fileSnapshot => {
          // upload finished.
          this.attachFile = null;
          fileSnapshot.ref.getDownloadURL().then((url) => {
            resolve(url);
          }).catch(err => {
            console.error(err);
          });
        }).catch(err => {
          console.error(err);
          reject(err);
        });
      } else {
        console.error(this.attachFile, 'empty');
        reject();
      }
    });
  }


  async editSubmit() {
    if(this.editProfileForm.valid && this.checkProfile) {
      const loading = await this.loading.show();
      try {
        const editData = this.editProfileForm.value;
        const updateProfileData = {
          displayName: this.editProfileForm.value['displayName'],
          photoURL: this.bizFire.afAuth.auth.currentUser.photoURL
        };
        await this.bizFire.updateProfile(updateProfileData);
        await this.bizFire.editUserProfile(editData);

        await loading.dismiss();
        await this.popoverCtrl.dismiss();
        await this.presentToast(this.langPack["update_success"],'success');

      }catch (e) {
        await loading.dismiss();
        // error 창.
        await this.presentToast(this.langPack["failed_update_profile"],'success');
      }
    } else {
      await this.popoverCtrl.dismiss();
    }

  }


  gotoChat() {
    const chatRooms = this.chatService.getChatRooms();
    console.log("chatRooms :",chatRooms);
    let selectedRoom: IChat;
    for(let room of chatRooms) {
      const member_list = room.data.members;

      if(Object.keys(member_list).length == 2) {
        if(member_list.hasOwnProperty(this.targetValue.uid)) {
          console.log("조건에 맞는 채팅방이 있습니다.",room);
          selectedRoom = {cid: room.cid,data : room.data} as IChat;
          break;
        }
      }
    }

    if(selectedRoom == null){
      this.chatService.createRoomByProfile(this.targetValue);
    } else {
      this.chatService.onSelectChatRoom.next(selectedRoom);
      this.electronService.openChatRoom(selectedRoom);
    }
    this.closePopover();
  }


  async presentToast(msg: string,color : string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2000,
      color: color,
      position: 'top',
      translucent: true,
    });
    toast.present();
  }


  closePopover() {
    this.popoverCtrl.dismiss(null);
  }
}
