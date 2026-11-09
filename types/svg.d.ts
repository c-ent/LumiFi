// react-native-svg-transformer turns an .svg import into a component at build
// time, so the module type has to be declared for TypeScript.
declare module '*.svg' {
  import type { FC } from 'react';
  import type { SvgProps } from 'react-native-svg';

  const SvgComponent: FC<SvgProps>;
  export default SvgComponent;
}
