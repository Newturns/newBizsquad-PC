import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SquadPageRoutingModule } from './squad-routing.module';

import { SquadPage } from './squad.page';
import {ComponentsModule} from '../../components/components.module';
import {FilterSquadPipe} from './filter-squad.pipe';
import {SortSquadPipe} from './sort-squad.pipe';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SquadPageRoutingModule,
    ComponentsModule
  ],
  declarations: [
    SquadPage,
    FilterSquadPipe,
    SortSquadPipe,
  ],
  exports: [
    FilterSquadPipe,
    SortSquadPipe,
  ]
})
export class SquadPageModule {}
