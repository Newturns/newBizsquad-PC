import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { SelectorPage } from './selector.page';

describe('SelectorPage', () => {
  let component: SelectorPage;
  let fixture: ComponentFixture<SelectorPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SelectorPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(SelectorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
