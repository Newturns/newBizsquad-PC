import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ChatFramePage } from './chat-frame.page';

describe('ChatFramePage', () => {
  let component: ChatFramePage;
  let fixture: ComponentFixture<ChatFramePage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ChatFramePage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ChatFramePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
