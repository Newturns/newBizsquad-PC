import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SquadPage } from './squad.page';

const routes: Routes = [
  {
    path: '',
    component: SquadPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SquadPageRoutingModule {}
