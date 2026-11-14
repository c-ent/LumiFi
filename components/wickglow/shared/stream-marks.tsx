import { Platform } from 'react-native';
import type { StreamService } from '@/src/core/stream-links';
import AppleMusicIcon from '@/assets/images/icons/Apple_Music_icon.svg';
import SpotifyIcon from '@/assets/images/icons/Spotify_icon.svg';
import YouTubeIcon from '@/assets/images/icons/YouTube_icon.svg';

// The `.svg` imports below are turned into React components by react-native-svg-transformer
// at build time, which is why they can be used as <Mark width=... />.
// `ratio` is each file's height/width, so the mark keeps its proportions.
//
// Artwork from assets/images/icons, shown at the left of the playing card.
// YouTube Music is not an embed, so it never reaches this card; the YouTube
// file covers that service only so the map stays complete.
const MARKS: Record<StreamService, { src: typeof SpotifyIcon; ratio: number }> = {
  spotify: { src: SpotifyIcon, ratio: 3964 / 3840 },
  youtube: { src: YouTubeIcon, ratio: 897 / 1280 },
  'youtube-music': { src: YouTubeIcon, ratio: 897 / 1280 },
  'apple-music': { src: AppleMusicIcon, ratio: 1 },
};

// Decorative, so hidden from screen readers. On web, react-native-svg spreads unknown
// props onto the DOM <svg>, so the native-only props would reach React DOM and warn;
// web gets aria-hidden instead.
const HIDDEN =
  Platform.OS === 'web'
    ? { 'aria-hidden': true }
    : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };

/** The mark for the service playing right now. Brand colours stay on the artwork. */
export function StreamServiceMark({ service, size = 28 }: { service: StreamService; size?: number }) {
  const mark = MARKS[service];
  const Mark = mark.src;
  return <Mark width={size} height={size * mark.ratio} {...HIDDEN} />;
}
