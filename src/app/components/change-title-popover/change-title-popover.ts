import { Component } from '@angular/core';
import {TakeUntil} from "../../biz-common/take-until";
import {FormBuilder, FormGroup, ValidatorFn, Validators} from "@angular/forms";
import {NavParams, PopoverController} from '@ionic/angular';
import {BizFireService} from '../../biz-fire/biz-fire';


@Component({
  selector: 'change-title-popover',
  templateUrl: 'change-title-popover.html',
  styleUrls: ['./change-title-popover.scss'],
})
export class ChangeTitlePopoverComponent extends TakeUntil {

  title : string;

  langPack = {};

  changeTitleForm: FormGroup;

  private titleValidator: ValidatorFn = Validators.compose([
    Validators.required,
  ]);

  constructor(private navParams: NavParams,
              private popoverCtrl: PopoverController,
              private bizFire : BizFireService,
              private formBuilder: FormBuilder,) {
    super();

    // 채팅방 제목 받음.
    this.title = this.navParams.get('title');

    this.bizFire.onLang
    .pipe(this.takeUntil)
    .subscribe((l: any) => {
      this.langPack = l.pack();
    });
  }

  ngOnInit(): void {
    this.changeTitleForm = this.formBuilder.group({
      title: [this.title, this.titleValidator],
    });
  }

  closePopup(){
    this.popoverCtrl.dismiss(false);
  }

  changeTitle() {
    this.popoverCtrl.dismiss(this.changeTitleForm.value['title']);
  }
}
