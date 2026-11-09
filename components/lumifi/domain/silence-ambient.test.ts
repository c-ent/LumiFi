import { silenceAmbientMix } from './silence-ambient';

// Ending a session while keeping the music sets every ambient level to zero and
// leaves the music level unchanged.

describe('silence ambient mix', () => {
  it('sets every ambient slider to zero and leaves the music level', () => {
    expect(silenceAmbientMix({
      music: 60,
      rain: 40,
      cafe: 10,
      fire: 0,
      wind: 25,
      clock: 5,
      brown: 80,
      forest: 15,
      keyboard: 30,
      waves: 70,
    })).toEqual({
      music: 60,
      rain: 0,
      cafe: 0,
      fire: 0,
      wind: 0,
      clock: 0,
      brown: 0,
      forest: 0,
      keyboard: 0,
      waves: 0,
    });
  });
});
