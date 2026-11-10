import { canUseFullscreen, fullscreenElement, requestEnterFullscreen, requestExitFullscreen } from './use-fullscreen';

describe('fullscreen support', () => {
  const original = globalThis.document;

  afterEach(() => {
    Object.defineProperty(globalThis, 'document', { value: original, configurable: true, writable: true });
  });

  function setDocument(value: unknown) {
    Object.defineProperty(globalThis, 'document', { value, configurable: true, writable: true });
  }

  it('is unavailable without a document, so native hides the control', () => {
    setDocument(undefined);
    expect(canUseFullscreen()).toBe(false);
  });

  it('needs both an enabled document and a request call', () => {
    setDocument({ fullscreenEnabled: true, documentElement: {} });
    expect(canUseFullscreen()).toBe(false);

    setDocument({ fullscreenEnabled: false, documentElement: { requestFullscreen: () => {} } });
    expect(canUseFullscreen()).toBe(false);

    setDocument({ fullscreenEnabled: true, documentElement: { requestFullscreen: () => {} } });
    expect(canUseFullscreen()).toBe(true);
  });

  it('accepts the webkit prefix some mobile browsers ship', () => {
    setDocument({ webkitFullscreenEnabled: true, documentElement: { webkitRequestFullscreen: () => {} } });
    expect(canUseFullscreen()).toBe(true);
  });
});

describe('fullscreen request calls', () => {
  const original = globalThis.document;

  afterEach(() => {
    Object.defineProperty(globalThis, 'document', { value: original, configurable: true, writable: true });
  });

  function setDocument(value: unknown) {
    Object.defineProperty(globalThis, 'document', { value, configurable: true, writable: true });
  }

  it('enters through the webkit call when only that name exists', () => {
    const enter = jest.fn(() => Promise.resolve());
    setDocument({ documentElement: { webkitRequestFullscreen: enter } });
    requestEnterFullscreen();
    expect(enter).toHaveBeenCalledTimes(1);
  });

  it('exits through the webkit call when only that name exists', () => {
    const exit = jest.fn(() => Promise.resolve());
    setDocument({ webkitExitFullscreen: exit });
    requestExitFullscreen();
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it('reads the webkit element while webkit holds fullscreen', () => {
    const element = { id: 'scene' };
    setDocument({ fullscreenElement: null, webkitFullscreenElement: element });
    expect(fullscreenElement()).toBe(element);
  });
});
