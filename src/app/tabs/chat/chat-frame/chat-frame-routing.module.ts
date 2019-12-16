import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ChatFramePage } from './chat-frame.page';

const routes: Routes = [
  {
    path: '',
    component: ChatFramePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ChatFramePageRoutingModule {}
