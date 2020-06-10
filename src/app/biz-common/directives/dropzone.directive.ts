import {Directive, HostListener, Output, EventEmitter, OnInit, Input, ElementRef} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {TakeUntil} from '../take-until';
import {auditTime} from 'rxjs/operators';

@Directive({
  selector: '[dropzone]'
})
export class DropzoneDirective extends TakeUntil implements OnInit {

  @Output() dropped =  new EventEmitter<FileList>();
  @Output() hovered =  new EventEmitter<boolean>();

  @Input() on : boolean = true;

  fileOver = new BehaviorSubject<boolean>(false);

  constructor(private el: ElementRef) {
    super();
  }


  ngOnInit() {

    this.fileOver
      .pipe(
        this.takeUntil,
        auditTime(500)
      )
      .subscribe((over: boolean) => {
        // console.log("fileOver",over);
        this.hovered.emit(over);
      })

  }

  @HostListener('dragover', ['$event']) onDragOver($event) {
    $event.preventDefault();
    $event.stopPropagation();
    if(this.on) {
      this.fileOver.next(true);
      // console.log("dragover");
      // this.hovered.emit(true);
      // this.createElement();
    }
  }

  @HostListener('drop', ['$event']) onDrop($event) {
    $event.preventDefault();
    $event.stopPropagation();
    if(this.on) {
      let files = $event.dataTransfer.files;
      if (files.length > 0) {
        this.dropped.emit($event.dataTransfer.files);
        console.log($event.dataTransfer.files)
      }
      // this.hovered.emit(false);
      this.fileOver.next(false);
    }
  }

  @HostListener('dragleave', ['$event']) onDragLeave($event) {
    $event.preventDefault();
    $event.stopPropagation();
    if(this.on) {
      // console.log("dragleave");
      // this.hovered.emit(false);
      this.fileOver.next(false);
    }
  }


  createElement() {
    // const hostElem = this.el.nativeElement;
    // hostElem.children[0].innerHTML = `<div style="width:100%;position: absolute;height: calc(100vh - 203px);background: darkred">hello word</div>`;
  }
}
