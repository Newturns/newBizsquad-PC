import {Component, Inject, OnInit} from '@angular/core';

import {finalize} from 'rxjs/operators';
import {AngularFireStorageReference, AngularFireUploadTask} from '@angular/fire/storage';
import {Observable} from 'rxjs';
import {UploadTaskSnapshot} from '@angular/fire/storage/interfaces';
import {IFiles} from '../../_models/message';
import {TakeUntil} from '../../biz-common/take-until';
import {BizFireService} from '../../biz-fire/biz-fire';
import {NavParams, PopoverController} from '@ionic/angular';

export interface IUploadItem {
  file: File,
  index : number,
  task?: AngularFireUploadTask,
  result: IFiles,
  storageRef?: AngularFireStorageReference,
  snapshotChanges$?: Observable<UploadTaskSnapshot>
  state?: string,
  percentage$?: Observable<number>,
  storagePath: string
}


@Component({
  selector: 'biz-upload-progress',
  templateUrl: './upload-progress.component.html',
  styleUrls: ['./upload-progress.component.scss']
})
export class UploadProgressComponent extends TakeUntil implements OnInit {

  private finishedItems: IUploadItem[] = [];

  uploadItems: IUploadItem[];
  currentItem: IUploadItem;

  sequentialTask = false;

  constructor(private bizFire: BizFireService,
              private navParams: NavParams,
              private popoverCtrl: PopoverController) {
    super();
  }

  ngOnInit() {

    // option
    // sequentialTask: true 면 순차 업로드. default 동시업로드
    this.sequentialTask = this.navParams.get('sequentialTask') ? this.navParams.get('sequentialTask') : false;

    this.uploadItems = this.navParams.get('item');

    this.uploadItems.forEach((item: IUploadItem, taskIndex) => {
      // upload file
      const filePath = `${item.storagePath}/${item.file.name}`;
      const storageRef = this.bizFire.afStorage.ref(filePath);
      const task = this.bizFire.afStorage.upload(filePath, item.file);

      // sequentialTask uploading.
      if(this.sequentialTask){
        // pause other files.
        if(taskIndex > 0){
          task.pause();
        }
      }

      item.task = task;
      item.storageRef = storageRef; // use to get downalodUrl
      item.percentage$ = task.percentageChanges();
      item.snapshotChanges$ = task.snapshotChanges();
      item.result = null;

      item.task.snapshotChanges()
        .pipe(
          finalize( async () =>  {
            console.log(`[${item.index}]`, 'finalize called.');

            try {
              const downloadUrl = await item.storageRef.getDownloadURL().toPromise();

              // save to data
              item.result = {
                name: item.file.name,
                size: item.file.size,
                type: item.file.type,
                url: downloadUrl,
                storagePath: `${item.storagePath}/${item.file.name}` // real file name
              } as IFiles;

              item.state = 'done';

              // delete currentItem ,for finished.
              if(this.currentItem && this.currentItem.index === item.index){
                this.currentItem = null;
              }

              this.finishedItems.push(item);

              // if current is last file, call finish.
              if(this.finishedItems.length === this.uploadItems.length){

                console.log('all file uploaded.');


                // 파일 메타데이터 업데이트
                const metadata = {
                  customMetadata: {
                    'owner': this.bizFire.uid,
                    'gid': this.bizFire.gid
                  }
                };

                item.storageRef.updateMetadata(metadata);

                this.onCloseDialog(this.finishedItems);

              } else {

                // go to next file
                if(this.sequentialTask){

                  // find next item
                  for(let i = 0 ; i <  this.uploadItems.length; i++){
                    if(this.uploadItems[i].state ! == 'done'){
                      this.uploadItems[i].task.resume();
                      //remember current item
                      this.currentItem = this.uploadItems[i];
                      break;
                    }
                  }
                }
              }

            } catch (e) {
              console.error(e);
              item.state = 'cancel';
              item.result = null;
            }

            //this.dialogRef.close(true);
          }),
        )
        .subscribe(state => {

          console.log(`[${item.index}]`, state, item.state);
          item.state = state.state;
        });

      return item;
    });

  }

  async onCancel(item: IUploadItem){
    console.log(item.index, 'onCancel');
    if(item.task){
      item.task.cancel();
    }

    // remove from task array
    for(let i = 0; i < this.uploadItems.length; i++){
      this.uploadItems[i].index === item.index;
      this.uploadItems.splice(i, 1);
      break;
    }
  }

  async onPause(item: IUploadItem){
    console.log(item.index, 'onPause');
    if(item.task) {
      item.task.pause();
    }
  }

  onResume(item: IUploadItem){
    console.log(item.index, 'onResume');
    if(item.task) {
      item.task.resume();
    }
  }


  onCloseDialog(ret: any){
    this.popoverCtrl.dismiss(ret);
  }


  onCancelAll(){
    console.log('onCancelAll');
    if(this.uploadItems){
      this.uploadItems.forEach(i => {
        if(i.state !== 'done'){
          i.task.cancel();
        }
      });
    }

    this.onCloseDialog(null);
  }

}
