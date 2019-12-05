import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { SquadPage } from './squad.page';

describe('SquadPage', () => {
  let component: SquadPage;
  let fixture: ComponentFixture<SquadPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SquadPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(SquadPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
