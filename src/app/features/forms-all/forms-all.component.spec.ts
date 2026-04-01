/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { FormsAllComponent } from './forms-all.component';

describe('FormsAllComponent', () => {
  let component: FormsAllComponent;
  let fixture: ComponentFixture<FormsAllComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [FormsAllComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FormsAllComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
