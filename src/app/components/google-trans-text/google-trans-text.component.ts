import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {SafeHtml} from '@angular/platform-browser';
import {IMessage} from '../../_models/message';
import {ITranslations, TranslateService} from '../../providers/translate.service';
import {BizFireService} from '../../biz-fire/biz-fire';

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
    const transLang = this.bizFire.currentUserValue.translateLang;

    if(transMsgs) {
      this.transText = transMsgs[transLang];
      if(this.transText == null) {
        this.onTranslate(this.text,transLang);
      }
    } else {
      this.onTranslate(this.text,transLang);
    }
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
