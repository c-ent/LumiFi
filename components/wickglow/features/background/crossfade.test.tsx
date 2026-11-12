import React, { act, useEffect } from 'react';
// @ts-expect-error react-dom has no type package in this project.
import { createRoot } from 'react-dom/client';
// @ts-expect-error react-dom has no type package in this project.
import { flushSync } from 'react-dom';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Crossfade } from './crossfade';
import { setLoadingBackground } from './background-loading';

// The shared loading value, read the way the pickers read it.
let mockLoading: string | null = null;
jest.mock('./background-loading', () => ({
  setLoadingBackground: jest.fn((id: string | null) => {
    mockLoading = id;
  }),
}));
// jsdom has no matchMedia, which the reduced-motion hook needs on web.
jest.mock('@/components/wickglow/hooks/use-reduced-motion', () => ({ useReducedMotion: () => false }));
const cue = (container: HTMLElement) => container.textContent?.includes('Loading scene') ?? false;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Ready at once, like a gradient.
function Instant({ id, onReady }: { id: string; onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return <span data-id={id} />;
}

// Reports ready only when the test says so, like a video's first frame.
const fire: Record<string, () => void> = {};
function Manual({ id, onReady }: { id: string; onReady: () => void }) {
  useEffect(() => {
    fire[id] = onReady;
  });
  return <span data-id={id} />;
}

function shown(container: HTMLElement) {
  return [...container.querySelectorAll('span')].map((span) => `${span.getAttribute('data-id')}@${getComputedStyle(span.parentElement as HTMLElement).opacity}`);
}

// Needs a DOM, which the default preset does not have, so it is skipped there.
// `npm test` also runs it under the web preset (jest.web.config.js), or run it
// alone with: npm run test:web
const suite = typeof document === 'undefined' ? describe.skip : describe;

suite('Crossfade', () => {
  let container: HTMLElement;
  let root: { render: (node: React.ReactNode) => void; unmount: () => void };
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockLoading = null;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.useRealTimers();
  });

  const element = (id: string, kind: 'instant' | 'manual') => (
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 1280, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <Crossfade
        id={id}
        render={(layerId, onReady) => (kind === 'instant' ? <Instant id={layerId} onReady={onReady} /> : <Manual id={layerId} onReady={onReady} />)}
      />
    </SafeAreaProvider>
  );
  // A normal-priority render, like the first one after loading.
  const draw = (id: string, kind: 'instant' | 'manual') => act(() => root.render(element(id, kind)));
  // A click-priority render, like picking a background.
  const click = (id: string, kind: 'instant' | 'manual') => act(() => {
    flushSync(() => root.render(element(id, kind)));
  });
  const wait = (ms: number) => act(() => {
    jest.advanceTimersByTime(ms);
  });

  it('first click after mount, gradient to gradient', () => {
    draw('a', 'instant');
    click('b', 'instant');
    // Ready at once, so it shows before the fallback could have run.
    expect(shown(container)).toEqual(['b@1']);
    wait(4100);
    expect(shown(container)).toEqual(['b@1']);
  });

  it('first click after mount, video that reported its first frame', () => {
    draw('a', 'manual');
    act(() => fire.a());
    click('b', 'manual');
    expect(shown(container)).toEqual(['a@1', 'b@0']);
    act(() => fire.b());
    // Its first frame shows it, well before the fallback.
    expect(shown(container)).toEqual(['b@1']);
    wait(4100);
    expect(shown(container)).toEqual(['b@1']);
  });

  it('a click after a late first frame', () => {
    draw('a', 'manual');
    click('b', 'manual');
    wait(4100);
    expect(shown(container)).toEqual(['b@1']);
    act(() => fire.b());
    click('c', 'manual');
    wait(4100);
    expect(shown(container)).toEqual(['c@1']);
  });

  it('quick clicks settle on the last one, and going back drops the loading one', () => {
    draw('a', 'manual');
    click('b', 'manual');
    click('c', 'manual');
    expect(shown(container)).toEqual(['a@1', 'c@0']);
    click('a', 'manual');
    expect(shown(container)).toEqual(['a@1']);
    click('c', 'manual');
    act(() => fire.c());
    expect(shown(container)).toEqual(['c@1']);
  });

  it('shows the loading cue while a slow background loads, and clears it once ready', () => {
    draw('a', 'manual');
    click('b', 'manual');
    wait(100);
    expect(cue(container)).toBe(false);
    expect(mockLoading).toBe(null);
    wait(200);
    expect(cue(container)).toBe(true);
    expect(mockLoading).toBe('b');
    act(() => fire.b());
    expect(cue(container)).toBe(false);
    expect(mockLoading).toBe(null);
  });

  it('shows no cue for a background that is ready at once', () => {
    draw('a', 'instant');
    click('b', 'instant');
    wait(1000);
    expect(cue(container)).toBe(false);
    expect(setLoadingBackground).not.toHaveBeenCalledWith('b');
  });
});
