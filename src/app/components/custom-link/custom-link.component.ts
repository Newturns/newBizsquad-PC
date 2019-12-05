import { Component, OnInit } from '@angular/core';
import {IBizGroup} from '../../_models';
import {FormBuilder, FormGroup, ValidatorFn, Validators} from '@angular/forms';
import {NavParams, PopoverController} from '@ionic/angular';
import {BizFireService} from '../../biz-fire/biz-fire';
import {TokenProvider} from '../../biz-common/token';
import {TakeUntil} from '../../biz-common/take-until';

@Component({
  selector: 'app-custom-link',
  templateUrl: './custom-link.component.html',
  styleUrls: ['./custom-link.component.scss'],
})
export class CustomLinkComponent extends TakeUntil implements OnInit {

  langPack = {};

  currentGroup: IBizGroup;
  addLinkForm: FormGroup;

  private linkTitleValidator: ValidatorFn = Validators.compose([
    Validators.required,
    Validators.maxLength(10)
  ]);

  // URL 유효성 검사 정규식
  reg = '(https?://)?([\\da-z.-]+)\\.([a-z.]{2,6})[/\\w .-]*/?';

  private linkUrlValidator: ValidatorFn = Validators.compose([
    Validators.required,
  ]);

  constructor(
      public navParams: NavParams,
      public bizFire: BizFireService,
      public formBuilder: FormBuilder,
      private tokenService: TokenProvider,
      private popoverCtrl : PopoverController
  ) {
    super();
  }

  ngOnInit(): void {

    this.bizFire.onLang.subscribe((l: any) => this.langPack = l.pack());

    this.addLinkForm = this.formBuilder.group({
      linkTitle: ['', this.linkTitleValidator],
      linkUrl: ['', this.linkUrlValidator],
    });
  }

  submitAddLink() {
    if(this.addLinkForm.valid) {
      let linkUrl = this.addLinkForm.value['linkUrl'];
      if(linkUrl.indexOf('http') != -1) {
        console.log('http가 포함됨');
      } else {
        linkUrl = "https://".concat(linkUrl);
      }
      this.tokenService.addCustomLink(this.bizFire.currentUID,this.addLinkForm.value['linkTitle'],linkUrl)
          .then(() =>{
            this.closePopup();
          });
    }
  }

  closePopup(){
    this.popoverCtrl.dismiss();
  }
}
