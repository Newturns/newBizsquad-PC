import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SelectorPageRoutingModule } from './selector-routing.module';

import { SelectorPage } from './selector.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SelectorPageRoutingModule
  ],
  declarations: [SelectorPage]
})
export class SelectorPageModule {}
