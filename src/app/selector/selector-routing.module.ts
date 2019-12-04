import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SelectorPage } from './selector.page';

const routes: Routes = [
  {
    path: '',
    component: SelectorPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SelectorPageRoutingModule {}
