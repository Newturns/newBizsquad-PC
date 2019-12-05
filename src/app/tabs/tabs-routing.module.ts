import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      },
      {
        path: 'home',
        children: [
          {
            path: '',
            loadChildren: () =>
                import('./home/home.module').then(m => m.HomePageModule)
          }
        ]
      },
      {
        path: 'squad',
        children: [
          {
            path: '',
            loadChildren: () =>
                import('./squad/squad.module').then(m => m.SquadPageModule)
          }
        ]
      },
      {
        path: 'chat',
        children: [
          {
            path: '',
            loadChildren: () =>
                import('./chat/chat.module').then(m => m.ChatPageModule)
          }
        ]
      },
      {
        path: 'members',
        children: [
          {
            path: '',
            loadChildren: () =>
                import('./members/members.module').then(m => m.MembersPageModule)
          }
        ]
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsPageRoutingModule {}
