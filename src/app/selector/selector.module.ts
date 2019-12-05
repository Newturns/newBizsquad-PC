import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IonicModule } from '@ionic/angular';

import { SelectorPageRoutingModule } from './selector-routing.module';

import { SelectorPage } from './selector.page';
import {ComponentsModule} from '../components/components.module';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    SelectorPageRoutingModule,
    ComponentsModule,
  ],
  declarations: [SelectorPage]
})
export class SelectorPageModule {}
