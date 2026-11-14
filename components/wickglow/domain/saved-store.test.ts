import { createSavedStore } from './saved-store';

describe('saved store', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const loaded = { n: 0, label: '' };

  it('does not write the state it was created with', () => {
    const write = jest.fn();
    const store = createSavedStore(loaded, write, 300);
    jest.advanceTimersByTime(1000);
    store.flush();
    expect(write).not.toHaveBeenCalled();
    expect(store.get()).toBe(loaded);
  });

  it('builds each change on the one before it and writes the burst once', () => {
    const write = jest.fn();
    const store = createSavedStore(loaded, write, 300);
    for (let step = 0; step < 40; step += 1) store.update((current) => ({ ...current, n: current.n + 1 }));
    expect(store.get().n).toBe(40);
    expect(write).not.toHaveBeenCalled();
    jest.advanceTimersByTime(300);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith({ n: 40, label: '' });
  });

  it('writes a commit at once, and only once', () => {
    const write = jest.fn();
    const store = createSavedStore(loaded, write, 300);
    const started = { n: 1, label: 'started' };
    store.commit(started);
    expect(store.get()).toBe(started);
    expect(write).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1000);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('keeps a waiting change when a commit is built on top of it', () => {
    const write = jest.fn();
    const store = createSavedStore(loaded, write, 300);
    store.update((current) => ({ ...current, label: 'slider' }));
    store.commit({ ...store.get(), n: 5 });
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenLastCalledWith({ n: 5, label: 'slider' });
    jest.advanceTimersByTime(1000);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('writes a change made after a commit', () => {
    const write = jest.fn();
    const store = createSavedStore(loaded, write, 300);
    store.commit({ n: 1, label: '' });
    store.update((current) => ({ ...current, n: 2 }));
    jest.advanceTimersByTime(300);
    expect(write).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenLastCalledWith({ n: 2, label: '' });
  });

  it('treats a change that returns the same state as no change', () => {
    const write = jest.fn();
    const listener = jest.fn();
    const store = createSavedStore(loaded, write, 300);
    store.subscribe(listener);
    store.update((current) => current);
    jest.advanceTimersByTime(1000);
    expect(listener).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  it('tells subscribers about every change, until they unsubscribe', () => {
    const listener = jest.fn();
    const store = createSavedStore(loaded, jest.fn(), 300);
    const unsubscribe = store.subscribe(listener);
    store.update((current) => ({ ...current, n: 1 }));
    store.commit({ n: 2, label: '' });
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    store.update((current) => ({ ...current, n: 3 }));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('has the new state in place by the time a subscriber is called', () => {
    const store = createSavedStore(loaded, jest.fn(), 300);
    const seen: number[] = [];
    store.subscribe(() => seen.push(store.get().n));
    store.update((current) => ({ ...current, n: 7 }));
    expect(seen).toEqual([7]);
  });

  it('adopts another tab\'s state without writing it back', () => {
    const write = jest.fn();
    const listener = jest.fn();
    const store = createSavedStore(loaded, write, 300);
    store.subscribe(listener);
    const fromOtherTab = { n: 9, label: 'paused' };
    store.adopt(fromOtherTab);
    expect(store.get()).toBe(fromOtherTab);
    expect(listener).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1000);
    expect(write).not.toHaveBeenCalled();
  });

  it('flushes a waiting change at once', () => {
    const write = jest.fn();
    const store = createSavedStore(loaded, write, 300);
    store.update((current) => ({ ...current, n: 1 }));
    store.flush();
    expect(write).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1000);
    expect(write).toHaveBeenCalledTimes(1);
  });
});
