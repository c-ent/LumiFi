import LogoArt from '@/assets/images/logo.svg';

// The app logo. It renders assets/images/logo.svg, the same file the app icon,
// favicon and splash screen are generated from, so the artwork lives in one place.
export function LogoMark({ size = 28 }: { size?: number }) {
  return <LogoArt width={size} height={size} />;
}
