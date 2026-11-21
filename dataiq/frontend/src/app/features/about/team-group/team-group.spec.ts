import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEAM } from '../about-photos';
import { TeamGroupSection } from './team-group';

describe('TeamGroupSection', () => {
  let fixture: ComponentFixture<TeamGroupSection>;
  const root = () => fixture.nativeElement as HTMLElement;
  const bars = () => Array.from(root().querySelectorAll('.progress span'));
  const currentBar = () => bars().findIndex((bar) => bar.classList.contains('current'));

  beforeEach(() => {
    fixture = TestBed.createComponent(TeamGroupSection);
    fixture.componentRef.setInput('group', TEAM[0]);
    fixture.detectChanges();
  });

  it('lleva el rótulo con el programa y su lema', () => {
    expect(root().querySelector('.label h3')!.textContent).toBe('Instrumentación Quirúrgica');
    expect(root().querySelector('.label p')!.textContent).toBe(
      'Las técnicas, el instrumental y la mesa',
    );
  });

  it('lista los tres retratos en su orden', () => {
    expect(
      Array.from(root().querySelectorAll('.lane li .name')).map((name) => name.textContent),
    ).toEqual(['Gabriela Rojas Iriarte', 'Gabriela Argel González', 'Milagro Fernández Polo']);
  });

  it('el trazo de avance es decorativo y empieza en el primero', () => {
    expect(root().querySelector('.progress')!.getAttribute('aria-hidden')).toBe('true');
    expect(bars()).toHaveLength(3);
    expect(currentBar()).toBe(0);
  });

  it('al desplazar el carril, el trazo sigue al retrato que quedó al inicio', () => {
    const lane = root().querySelector<HTMLElement>('.lane')!;
    const first = lane.firstElementChild as HTMLElement;
    Object.defineProperty(first, 'offsetWidth', { value: 280 });
    Object.defineProperty(lane, 'clientWidth', { value: 370 });
    Object.defineProperty(lane, 'scrollWidth', { value: 900 });

    lane.scrollLeft = 290;
    lane.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    expect(currentBar()).toBe(1);

    lane.scrollLeft = 530;
    lane.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    expect(currentBar()).toBe(2);
  });
});
