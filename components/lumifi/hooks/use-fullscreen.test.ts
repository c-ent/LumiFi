import { canUseFullscreen } from './use-fullscreen';

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
