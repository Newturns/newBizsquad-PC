import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {SafeHtml} from '@angular/platform-browser';
import {IMessage} from '../../_models/message';
import {ITranslations, TranslateService} from '../../providers/translate.service';
import {BizFireService} from '../../biz-fire/biz-fire';
import {filter, take} from 'rxjs/operators';

@Component({
  selector: 'biz-google-trans-text',
  templateUrl: './google-trans-text.component.html',
  styleUrls: ['./google-trans-text.component.scss']
})
export class GoogleTransTextComponent implements OnInit {

  @Input()
  set message(msg: IMessage){
    this._message = msg;
    if(this._message){
      this.checkTransMsg(this._message);
    }
  }

  get message(){
    return this._message;
  }

  private _message: IMessage;

  @Input()
  transText : string;

  @Input()
  textColor : string;

  @Input()
  whiteBackground : boolean = false;

  @Input()
  fontSize : string;

  @Output()
  finishTranslation = new EventEmitter<boolean>();

  text: string;
  transError: string;

  constructor(private translateService: TranslateService,
              private bizFire : BizFireService,) { }

  ngOnInit() {}

  private convertMessage(message: IMessage): string {

    let ret: string = '';
    if (message.data.message && message.data.message.text) {
      let text = message.data.message.text;

      ret = text;
    }
    return ret;
  }

  private checkTransMsg(message : IMessage) {
    this.text = this.convertMessage(message);
    const transMsgs = message.data.translate;
    const currentGroup = this.bizFire.currentBizGroup;

    this.bizFire.userData
    .pipe(take(1),filter(d => d != null))
    .subscribe((userData:any) => {
      const groupUserData = this.bizFire.userDataValue;
      const transLang = groupUserData.translateLang || currentGroup.data.transPack[0];

      console.log("currentGroup",currentGroup);
      console.log("groupUserData",groupUserData);

      if(transLang) {
        if(transMsgs) {
          this.transText = transMsgs[transLang];
          if(this.transText == null) {
            this.onTranslate(this.text,transLang);
          }
        } else {
          this.onTranslate(this.text,transLang);
        }
      }

    });

  }

  onTranslate(text: string, translateLang: string) {
    console.log("onTranslate start!!");
    if(text && !this.transText) {
      this.translateService.translateText(text, translateLang)
          .then((translations: ITranslations[]) => {
            this.transText = translations[0].translatedText;
            this._message.ref.set({
              translate : {
                [translateLang] : this.transText
              }
            },{merge: true});
            this.finishTranslation.emit(true);
            // console.log(this.translations);
          }).catch( (reason: any) => {
        if(reason && reason.message){
          this.transError = reason.message;
        }
        this.finishTranslation.emit(true);
      });
    }
  }

}
