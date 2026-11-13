import {
  downloadFraction,
  formatMegabytes,
  isCompleteDownload,
  localFileName,
  remoteScenesEnabled,
  remoteUrl,
} from './remote-scenes';

const frog = { path: 'v1/videos/frog_lily_pond.mp4', bytes: 9847972 };

describe('remoteScenesEnabled', () => {
  it('is off while no host is set', () => {
    expect(remoteScenesEnabled('')).toBe(false);
    expect(remoteScenesEnabled('   ')).toBe(false);
  });

  it('is on with a host', () => {
    expect(remoteScenesEnabled('https://example.com/scenes')).toBe(true);
  });
});

describe('remoteUrl', () => {
  it('joins the host and the path', () => {
    expect(remoteUrl(frog, 'https://example.com/scenes')).toBe('https://example.com/scenes/v1/videos/frog_lily_pond.mp4');
  });

  it('ignores extra slashes on either side', () => {
    expect(remoteUrl({ path: '/v1//a.mp4', bytes: 1 }, 'https://h.dev///')).toBe('https://h.dev/v1/a.mp4');
  });

  it('encodes unsafe characters in each part', () => {
    expect(remoteUrl({ path: 'v1/my scene.mp4', bytes: 1 }, 'https://h.dev')).toBe('https://h.dev/v1/my%20scene.mp4');
  });

  it('builds a same-site path from a relative host', () => {
    expect(remoteUrl(frog, '/scenes')).toBe('/scenes/v1/videos/frog_lily_pond.mp4');
  });

  it('is null while no host is set', () => {
    expect(remoteUrl(frog, '')).toBeNull();
  });
});

describe('localFileName', () => {
  it('keeps the version in a flat name', () => {
    expect(localFileName(frog)).toBe('v1_videos_frog_lily_pond.mp4');
  });

  it('cannot climb out of the folder', () => {
    expect(localFileName({ path: '../../etc/passwd', bytes: 1 })).toBe('etc_passwd');
    expect(localFileName({ path: 'v1/a b?.mp4', bytes: 1 })).toBe('v1_ab.mp4');
  });

  it('never returns an empty name', () => {
    expect(localFileName({ path: '..', bytes: 1 })).toBe('scene');
  });
});

describe('formatMegabytes', () => {
  it('shows one decimal under 10 MB', () => {
    expect(formatMegabytes(9847972)).toBe('9.4 MB');
    expect(formatMegabytes(572638)).toBe('0.5 MB');
  });

  it('rounds from 10 MB up', () => {
    expect(formatMegabytes(10.6 * 1024 * 1024)).toBe('11 MB');
  });

  it('treats a negative size as zero', () => {
    expect(formatMegabytes(-5)).toBe('0.0 MB');
  });
});

describe('downloadFraction', () => {
  it('uses the server total when given', () => {
    expect(downloadFraction(50, 200, 999)).toBe(0.25);
  });

  it('falls back to the expected size when the server sends none', () => {
    expect(downloadFraction(50, -1, 100)).toBe(0.5);
  });

  it('stays between 0 and 1', () => {
    expect(downloadFraction(0, 100, 100)).toBe(0);
    expect(downloadFraction(300, 100, 100)).toBe(1);
    expect(downloadFraction(10, -1, 0)).toBe(0);
  });
});

describe('isCompleteDownload', () => {
  it('accepts only the exact size', () => {
    expect(isCompleteDownload(9847972, frog)).toBe(true);
    expect(isCompleteDownload(9847971, frog)).toBe(false);
    expect(isCompleteDownload(null, frog)).toBe(false);
    expect(isCompleteDownload(undefined, frog)).toBe(false);
  });
});
