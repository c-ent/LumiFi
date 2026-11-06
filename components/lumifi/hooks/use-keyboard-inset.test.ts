import { keyboardCover, visualKeyboardCover } from './use-keyboard-inset';

describe('keyboard cover', () => {
  it('is the gap between the window bottom and the top of the keyboard', () => {
    expect(keyboardCover(800, 500)).toBe(300);
    expect(keyboardCover(500, 500)).toBe(0);
    expect(keyboardCover(500, 640)).toBe(0);
  });

  it('reads a mobile browser keyboard from the visual viewport', () => {
    expect(visualKeyboardCover(800, 470, 0)).toBe(330);
    expect(visualKeyboardCover(800, 470, 40)).toBe(290);
    expect(visualKeyboardCover(800, 800, 0)).toBe(0);
  });
});
