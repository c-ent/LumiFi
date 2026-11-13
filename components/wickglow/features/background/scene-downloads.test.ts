import { remoteFileOf, sceneOffered } from './scene-downloads';

jest.mock('@/components/wickglow/domain/scene-files', () => ({
  sceneFileUri: () => null,
  downloadSceneFile: jest.fn(),
}));

const remote = { path: 'v1/videos/frog_lily_pond.mp4', bytes: 9847972 };

describe('remoteFileOf', () => {
  it('returns the file for a remote scene', () => {
    expect(remoteFileOf(remote)).toBe(remote);
  });

  it('treats a bundled module number as bundled', () => {
    expect(remoteFileOf(7)).toBeNull();
  });

  // On web a bundled require() of a video can be an asset object, not a number.
  it('treats a bundled asset object as bundled', () => {
    const asset = { uri: '/assets/classic.mp4', httpServerLocation: '/assets' } as unknown as number;
    expect(remoteFileOf(asset)).toBeNull();
    expect(sceneOffered(asset)).toBe(true);
  });
});
