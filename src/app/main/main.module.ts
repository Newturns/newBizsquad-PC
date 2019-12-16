import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {RouterModule, Routes} from '@angular/router';
import {HomeGuard} from '../core/home-guard';
import {GidLoadService} from '../core/gid-load.service';
import {isChatValue} from '../core/isChatValue';

const routes: Routes = [
  {
    path: '',
    canActivate: [
      HomeGuard, // check login
    ],
    canActivateChild:[

    ],
    children: [
      {
        path: '',
        redirectTo: 'tabs'
      },
      {
        path: 'tabs',
        canActivate: [
          GidLoadService, // check last gid.
        ],
        loadChildren: () => import('../tabs/tabs.module').then(m => m.TabsPageModule),
      },
      {
        path: 'selector',
        loadChildren: () => import('../selector/selector.module').then(m => m.SelectorPageModule),
      },
      {
        path: 'chat-frame',
        loadChildren: () => import('../tabs/chat/chat-frame/chat-frame.module').then(m => m.ChatFramePageModule)
      },
    ]
  }
];

@NgModule({
  declarations: [
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
  ],
  providers:[
    GidLoadService,
  ]
})
export class MainModule { }
