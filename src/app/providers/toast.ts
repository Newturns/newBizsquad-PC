import { Injectable } from '@angular/core';
import {ToastController} from '@ionic/angular';

@Injectable()
export class ToastProvider {

  isToastPresent:boolean=false;

  constructor(private toastCtrl: ToastController) { }

  async presentToast(text,position?) {
      const toast = await this.toastCtrl.create({
        message: text,
        duration: 3000,
        position: position
      });
      await toast.present();

      this.isToastPresent=true;

      await toast.onDidDismiss().then(() => {
        this.isToastPresent=false;
        console.log('Dismissed toast');
      });
  }

  async showToast(text:string,position?:string) {
    this.isToastPresent ? '': this.presentToast(text,position);
  }

}
