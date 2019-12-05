import { Component, OnInit } from '@angular/core';
import {BizFireService} from '../../biz-fire/biz-fire';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {

  constructor(private bizFire : BizFireService) {
  }

  ngOnInit() {
  }

}
