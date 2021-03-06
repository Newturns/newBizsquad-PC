import { Injectable } from '@angular/core';
import { LoadingController } from '@ionic/angular';

@Injectable()
export class LoadingProvider {

  constructor(private loadingCtrl: LoadingController) { }

  async show() {
    const loading = await this.loadingCtrl.create({
      duration: 2000,
      spinner: "circles",
      cssClass: "custom-loading"
    });
    await loading.present();
    return loading;
  }
}
