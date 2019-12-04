import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {RouterModule, Routes} from '@angular/router';
import {HomeGuard} from '../core/home-guard';
import {GidLoadService} from '../core/gid-load.service';

const routes: Routes = [
  {
    path: '',
    canActivate: [
      HomeGuard, // check login
      GidLoadService, // check last gid.
    ],
    canActivateChild:[
    
    ],
    children: [
      {
        path: '',
        redirectTo: 'tabs'
      },
      // {
      //   path: 'tabs',
      //   loadChildren: () => import('../tabs/tabs.module').then(m => m.TabsPageModule),
      // },
      {
        path: 'selector',
        loadChildren: () => import('../selector/selector.module').then(m => m.SelectorPageModule),
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
