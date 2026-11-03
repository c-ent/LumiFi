import { layoutForWidth, layoutForWindow } from './layout';

describe('layout for window width', () => {
  it('uses the phone under 600, the tablet from 600 to 840, and the desktop above 840', () => {
    expect(layoutForWidth(360)).toBe('phone');
    expect(layoutForWidth(599)).toBe('phone');
    expect(layoutForWidth(600)).toBe('tablet');
    expect(layoutForWidth(768)).toBe('tablet');
    expect(layoutForWidth(840)).toBe('tablet');
    expect(layoutForWidth(841)).toBe('desktop');
    expect(layoutForWidth(1280)).toBe('desktop');
  });

  it('keeps a rotated phone or tablet on the split layout, and a wide browser on the desktop scene', () => {
    expect(layoutForWindow(412, 915, 'native')).toBe('phone');
    expect(layoutForWindow(915, 412, 'native')).toBe('tablet');
    expect(layoutForWindow(800, 1280, 'native')).toBe('tablet');
    expect(layoutForWindow(1280, 800, 'native')).toBe('tablet');
    expect(layoutForWindow(1200, 900, 'native')).toBe('desktop');
    expect(layoutForWindow(1280, 800, 'web')).toBe('desktop');
    expect(layoutForWindow(768, 1024, 'web')).toBe('tablet');
  });
});
