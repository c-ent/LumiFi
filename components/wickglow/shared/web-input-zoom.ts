const STYLE_ID = 'wickglow-input-zoom';

/**
 * Mobile browsers zoom into a focused text field whose font is under 16px.
 * The zoom changes the visual viewport's scale, and `useKeyboardInset` reads a
 * scaled viewport as a pinch zoom, not a keyboard, so the sheet stayed put and
 * the keyboard covered the field. Text fields on touch screens get 16px, so the
 * page does not zoom and the sheet lifts above the keyboard.
 *
 * Touch screens only (`pointer: coarse`): desktop keeps the designed sizes.
 * `!important` is needed because react-native-web sets the font size through
 * class names, which outrank a plain element selector. Web only. Installed
 * once; safe to call again.
 */
export function installWebInputZoomGuard() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (pointer: coarse) {
      input, textarea, select { font-size: 16px !important; }
    }
  `;
  document.head.appendChild(style);
}
