import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { NotifyPageRoutingModule } from './notify-routing.module';

import { NotifyPage } from './notify.page';
import {ComponentsModule} from '../../components/components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NotifyPageRoutingModule,
    ComponentsModule
  ],
  declarations: [NotifyPage]
})
export class NotifyPageModule {}
