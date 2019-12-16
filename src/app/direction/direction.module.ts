import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DirectionPageRoutingModule } from './direction-routing.module';

import { DirectionPage } from './direction.page';
import {LoadingProvider} from '../providers/loading';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DirectionPageRoutingModule
  ],
  declarations: [DirectionPage],
  providers: [
    LoadingProvider,
  ]
})
export class DirectionPageModule {}
