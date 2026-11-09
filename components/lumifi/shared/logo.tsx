import LogoArt from '@/assets/images/logo.svg';

export function LogoMark({ size = 28 }: { size?: number }) {
  return <LogoArt width={size} height={size} />;
}
