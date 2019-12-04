import {Component, Input, OnInit} from '@angular/core';
import {IFiles} from "../../_models/message";
import {Commons} from "../../biz-common/commons";
import {Electron} from '../../providers/electron';


@Component({
  selector: 'biz-chat-attach',
  templateUrl: './chat-attach.component.html',
})
export class ChatAttachComponent implements OnInit {

  @Input()
  files: IFiles[];

  @Input()
  isMyMessage : boolean = false;

  @Input()
  postFiles : boolean = false;

  constructor(public electronService: Electron) { }

  ngOnInit() {
  }

  isImageFile(file: any): boolean {
    return Commons.isImageFile(file);
  }

  goLink(url) {
    this.electronService.goLink(url);
  }

}
