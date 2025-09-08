import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CellMenu } from './cell-menu';

describe('CellMenu', () => {
  let component: CellMenu;
  let fixture: ComponentFixture<CellMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CellMenu]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CellMenu);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
