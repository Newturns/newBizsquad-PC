import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ChatPageRoutingModule } from './chat-routing.module';

import { ChatPage } from './chat.page';
import {ComponentsModule} from '../../components/components.module';
import {PipesModule} from '../../components/pipes/pipes.module';
import {GroupColorProvider} from '../../biz-common/group-color';
import {SortChatPipe} from './sort-chat.pipe';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ChatPageRoutingModule,
    ComponentsModule,
    PipesModule,
  ],
  declarations: [
    ChatPage,
    SortChatPipe
  ],
  exports: [
    SortChatPipe,
  ],
  providers: [GroupColorProvider]
})
export class ChatPageModule {}
