import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text } from 'react-native';

/**
 * Animated counter that smoothly counts from the previous value to the new one.
 * format(v) — optional formatting function, defaults to Spanish currency style.
 */
export default function AnimatedNumber({ value, style, format, duration = 700 }) {
  const anim = useRef(new Animated.Value(value)).current;
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setDisplay(v));
    Animated.timing(anim, { toValue: value, duration, useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [value, duration, anim]);

  const fmt = format || ((v) => {
    const abs = Math.abs(v);
    const str = abs.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (v < 0 ? '-' : '') + str + ' €';
  });

  return <Text style={style}>{fmt(display)}</Text>;
}
