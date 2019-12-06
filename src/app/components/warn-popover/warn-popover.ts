import { Component } from '@angular/core';
import {NavParams, PopoverController} from '@ionic/angular';


@Component({
  selector: 'warn-popover',
  templateUrl: 'warn-popover.html',
  styleUrls: ['./warn-popover.scss'],
})

export class WarnPopoverComponent {

  title : string;

  description : string;


  constructor(private navParams: NavParams,
              private popoverCtrl: PopoverController) {
    this.title = this.navParams.get('title');
    this.description = this.navParams.get('description');
  }


  cancel() {
    this.popoverCtrl.dismiss(false);
  }

  ok() {
    this.popoverCtrl.dismiss(true);
  }

  closePopup(){
    this.popoverCtrl.dismiss(false);
  }

}
