import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ChatFramePageRoutingModule } from './chat-frame-routing.module';

import { ChatFramePage } from './chat-frame.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ChatFramePageRoutingModule
  ],
  declarations: [ChatFramePage]
})
export class ChatFramePageModule {}
