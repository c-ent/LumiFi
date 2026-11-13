import { colors } from '@/src/theme/tokens';
import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// The web page shell (static output only; native never uses this file).
//
// `headNodes` and `bodyNodes` are what Expo adds to every page: the app's
// script tags, styles and fonts. They must be rendered here, as Expo's own
// default shell does. Without them the exported page has no scripts, never
// starts, and stays on the dark loading screen (the black screen of
// 2026-11-13, from when this file was added in ba5822c).
//
// `interactive-widget=resizes-content`: when the on-screen keyboard opens, the
// browser shrinks the page to the space above it instead of sliding the
// keyboard over the bottom. A bottom-pinned sheet then rises with the page, so
// the focused field stays visible. Chrome and Firefox on Android honour it.
// Safari ignores it; there `useKeyboardInset` lifts the sheet from the visual
// viewport instead. With the page resized, that hook reads no gap between the
// page and the visual viewport, so the two never lift the sheet twice.
export default function Root({ children }: PropsWithChildren) {
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();
  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, interactive-widget=resizes-content"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `body { background-color: ${colors.bgBase}; }` }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
