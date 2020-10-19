import { Component, OnInit } from '@angular/core';
import {NavParams, PopoverController} from '@ionic/angular';

@Component({
  selector: 'app-clipboard-attach-popover',
  templateUrl: './clipboard-attach-popover.component.html',
  styleUrls: ['./clipboard-attach-popover.component.scss'],
})
export class ClipboardAttachPopoverComponent implements OnInit {

  cancel : string = 'cancel';
  send : string = 'send';

  base64Image : string;

  constructor(private navParams: NavParams,
              private popoverCtrl: PopoverController,) { }

  ngOnInit() {
    this.send = this.navParams.get('send');
    this.cancel = this.navParams.get('cancel');
    this.base64Image = this.navParams.get('base64Image');

    console.log("imageFile",this.base64Image);
  }

  sendImage() {
    this.popoverCtrl.dismiss(true);
  }

  cancelAttach() {
    this.popoverCtrl.dismiss(false);
  }

}
