import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GoogleTransTextComponent } from './google-trans-text.component';

describe('GoogleTransTextComponent', () => {
  let component: GoogleTransTextComponent;
  let fixture: ComponentFixture<GoogleTransTextComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GoogleTransTextComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GoogleTransTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
