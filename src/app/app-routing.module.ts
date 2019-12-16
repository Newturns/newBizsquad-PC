import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import {ConfigService} from './config.service';

const routes: Routes = [
  { path: '', redirectTo: 'direction', pathMatch: 'full' },
  // 첫실행시 로그인패이지로, 채팅룸 클릭시 채팅프레임으로...
  { path: 'direction', loadChildren: () => import('./direction/direction.module').then( m => m.DirectionPageModule)},
  { path: 'login', loadChildren: './login/login.module#LoginPageModule' },
  { path: ':firebaseName', canLoad:[ ConfigService], loadChildren: ()=> import('./main/main.module').then(m => m.MainModule)},
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
