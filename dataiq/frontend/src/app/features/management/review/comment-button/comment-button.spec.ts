import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CommentButton } from './comment-button';

@Component({
  imports: [CommentButton],
  template: '<button app-comment-button type="button">Comentar</button>',
})
class Host {}

describe('CommentButton', () => {
  it('es un botón con su texto', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.textContent!.trim()).toBe('Comentar');
    expect(button.type).toBe('button');
  });
});
