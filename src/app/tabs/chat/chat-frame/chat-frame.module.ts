import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {ReactiveFormsModule} from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ChatFramePageRoutingModule } from './chat-frame-routing.module';

import { ChatFramePage } from './chat-frame.page';
import {ComponentsModule} from '../../../components/components.module';
import {LoadingProvider} from '../../../providers/loading';
import {ToastProvider} from '../../../providers/toast';
import {Autosize} from '../../../biz-common/directives/autosize';
import {DropzoneDirective} from '../../../biz-common/directives/dropzone.directive';
import {ChatService} from '../../../providers/chat.service';
import {ProgressBarComponent} from '../../../components/progress-bar/progress-bar';
import {UploadProgressComponent} from '../../../components/upload-progress/upload-progress.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ComponentsModule,
    ChatFramePageRoutingModule,
    ReactiveFormsModule
  ],
  declarations: [
    ChatFramePage,
    Autosize,
    DropzoneDirective,
    ProgressBarComponent,
    UploadProgressComponent,
  ],
  exports: [
    ProgressBarComponent,
    UploadProgressComponent,
  ],
  entryComponents : [
    ProgressBarComponent,
    UploadProgressComponent,
  ],
  providers: [
    LoadingProvider,
    ToastProvider,
    ChatService
  ]
})
export class ChatFramePageModule {}
