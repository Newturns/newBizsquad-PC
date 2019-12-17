import { Component, OnInit } from '@angular/core';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {BizFireService} from '../../biz-fire/biz-fire';
import {PopoverController} from '@ionic/angular';

@Component({
  selector: 'app-chat-menu-popover',
  templateUrl: './chat-menu-popover.component.html',
  styleUrls: ['./chat-menu-popover.component.scss'],
})
export class ChatMenuPopoverComponent implements OnInit {

  private _unsubscribeAll;

  langPack = {};

  constructor(private bizFire : BizFireService,
              private popoverCtrl : PopoverController) {
    this._unsubscribeAll = new Subject<any>();
  }

  ngOnInit() {
    this.bizFire.onLang.pipe(takeUntil(this._unsubscribeAll)).subscribe((l: any) => this.langPack = l.pack());
  }

  clickEvent(ev : string) {
    this.popoverCtrl.dismiss(ev);
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

}
