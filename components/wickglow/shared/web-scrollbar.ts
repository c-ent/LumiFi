import { colors, fade } from '@/src/theme/tokens';

const STYLE_ID = 'wickglow-scrollbar';

/**
 * A thin, dark scrollbar in place of the browser default, so a panel's own
 * scroll (e.g. the scene picker) matches the glass-panel look instead of an
 * OS-chrome bar. Web only. Installed once; safe to call again.
 */
export function installWebScrollbar() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    * { scrollbar-width: thin; scrollbar-color: ${fade('#FFFFFF', 0.18)} transparent; }
    *::-webkit-scrollbar { width: 8px; height: 8px; }
    *::-webkit-scrollbar-track { background: transparent; }
    *::-webkit-scrollbar-thumb { background-color: ${fade('#FFFFFF', 0.18)}; border-radius: 8px; }
    *::-webkit-scrollbar-thumb:hover { background-color: ${fade(colors.accent, 0.6)}; }
  `;
  document.head.appendChild(style);
}
