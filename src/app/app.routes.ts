import { Routes } from '@angular/router';
import {Home} from './pages/home/home';
import {Board} from './pages/board/board';

export const routes: Routes = [
  { path: 'home', component: Home },
  { path: 'board', component: Board },
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: '**', redirectTo: 'home' }
];
