import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Every ambient animation loops forever, so honour the system setting rather
// than animating at someone who asked for stillness. Starts false so the first
// frame matches the server-rendered web output.
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduced(value);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
