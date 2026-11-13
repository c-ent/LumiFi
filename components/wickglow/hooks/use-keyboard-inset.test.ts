import { keyboardCover, visualKeyboardCover } from './use-keyboard-inset';

describe('keyboard cover', () => {
  it('is the reported keyboard height, rounded and never negative', () => {
    expect(keyboardCover(300)).toBe(300);
    expect(keyboardCover(291.6)).toBe(292);
    expect(keyboardCover(0)).toBe(0);
    expect(keyboardCover(-12)).toBe(0);
    expect(keyboardCover(Number.NaN)).toBe(0);
  });

  it('reads a mobile browser keyboard from the visual viewport', () => {
    expect(visualKeyboardCover(800, 470, 0)).toBe(330);
    expect(visualKeyboardCover(800, 470, 40)).toBe(290);
    expect(visualKeyboardCover(800, 800, 0)).toBe(0);
  });
});
