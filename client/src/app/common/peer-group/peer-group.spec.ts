import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PeerGroup } from './peer-group';

describe('PeerGroup', () => {
  let component: PeerGroup;
  let fixture: ComponentFixture<PeerGroup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PeerGroup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PeerGroup);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
