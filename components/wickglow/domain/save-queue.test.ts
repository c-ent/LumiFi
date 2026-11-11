import { createSaveQueue } from './save-queue';

describe('save queue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const loaded = { n: 0 };

  it('writes once after a burst of changes, with the newest state', () => {
    const write = jest.fn();
    const queue = createSaveQueue(write, 300, loaded);
    for (let n = 1; n <= 40; n += 1) {
      queue.later({ n });
      jest.advanceTimersByTime(20);
    }
    expect(write).not.toHaveBeenCalled();
    jest.advanceTimersByTime(300);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith({ n: 40 });
  });

  it('does not write the state that was just loaded', () => {
    const write = jest.fn();
    const queue = createSaveQueue(write, 300, loaded);
    queue.later(loaded);
    jest.advanceTimersByTime(1000);
    queue.flush();
    expect(write).not.toHaveBeenCalled();
  });

  it('writes a timer change at once and does not write it a second time', () => {
    const write = jest.fn();
    const queue = createSaveQueue(write, 300, loaded);
    const started = { n: 1 };
    queue.now(started);
    expect(write).toHaveBeenCalledTimes(1);
    // The persist effect then sees the same state.
    queue.later(started);
    jest.advanceTimersByTime(1000);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('drops an older waiting state when a timer change is written', () => {
    const write = jest.fn();
    const queue = createSaveQueue(write, 300, loaded);
    queue.later({ n: 1 });
    const committed = { n: 2 };
    queue.now(committed);
    jest.advanceTimersByTime(1000);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenLastCalledWith(committed);
  });

  it('still writes a change made after a timer change', () => {
    const write = jest.fn();
    const queue = createSaveQueue(write, 300, loaded);
    queue.now({ n: 1 });
    queue.later({ n: 2 });
    jest.advanceTimersByTime(300);
    expect(write).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenLastCalledWith({ n: 2 });
  });

  it('flushes a waiting state at once, and only once', () => {
    const write = jest.fn();
    const queue = createSaveQueue(write, 300, loaded);
    queue.later({ n: 1 });
    queue.flush();
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith({ n: 1 });
    queue.flush();
    jest.advanceTimersByTime(1000);
    expect(write).toHaveBeenCalledTimes(1);
  });
});
