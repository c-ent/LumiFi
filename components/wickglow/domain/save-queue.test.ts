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

  it('writes the waiting state on dispose, then never writes or retries again', async () => {
    const write = jest.fn(async () => false);
    const queue = createSaveQueue(write, 300, loaded);
    queue.later({ n: 1 });
    queue.dispose();
    expect(write).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    jest.advanceTimersByTime(120000);
    queue.later({ n: 2 });
    queue.now({ n: 3 });
    jest.advanceTimersByTime(120000);
    expect(write).toHaveBeenCalledTimes(1);
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

  it('keeps a failed write and retries it', async () => {
    const write = jest.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    const queue = createSaveQueue(write, 300, loaded);
    const state = { n: 1 };
    queue.now(state);
    await Promise.resolve();
    // The persist effect hands the same state back; it must not count as saved.
    queue.later(state);
    jest.advanceTimersByTime(300);
    expect(write).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenLastCalledWith(state);
  });

  it('retries a failed write after a pause when nothing else changes', async () => {
    const write = jest.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    const queue = createSaveQueue(write, 300, loaded);
    queue.now({ n: 1 });
    await Promise.resolve();
    expect(write).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(2000);
    expect(write).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenLastCalledWith({ n: 1 });
  });

  it('does not retry a failed write once a newer state was written', async () => {
    const write = jest.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    const queue = createSaveQueue(write, 300, loaded);
    queue.now({ n: 1 });
    queue.now({ n: 2 });
    await Promise.resolve();
    jest.advanceTimersByTime(60000);
    expect(write).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenLastCalledWith({ n: 2 });
  });

  it('queues a failed state again when it comes back while a newer one waits', async () => {
    const write = jest.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    const queue = createSaveQueue(write, 300, loaded);
    const first = { n: 1 };
    queue.now(first);
    queue.later({ n: 2 });
    await Promise.resolve();
    // The change is undone back to the state whose write failed.
    queue.later(first);
    jest.advanceTimersByTime(300);
    expect(write).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenLastCalledWith(first);
  });
});
