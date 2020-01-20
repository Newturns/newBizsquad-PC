import {Component, Input, OnInit} from '@angular/core';
import {SafeHtml} from '@angular/platform-browser';

@Component({
  selector: 'biz-google-trans-text',
  templateUrl: './google-trans-text.component.html',
  styleUrls: ['./google-trans-text.component.scss']
})
export class GoogleTransTextComponent implements OnInit {

  @Input()
  transText : string;

  @Input()
  textColor : string;

  @Input()
  whiteBackground : boolean = false;

  @Input()
  fontSize : string;


  constructor() { }

  ngOnInit() {
  }

}
