import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Every ambient animation loops forever, so honour the system setting rather
// than animating at someone who asked for stillness. Starts reduced, so nothing
// moves until the setting has been read and allows it. That is still a fixed
// first frame, so it matches the server-rendered web output.
export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduced(value);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      // Some platforms return no subscription.
      sub?.remove();
    };
  }, []);

  return reduced;
}
