import React from 'react';
import { Text } from 'react-native';
import { COLORS } from '../theme';

/**
 * Renders a category/account emoji with a subtle neon glow that
 * integrates with the dark theme.
 *
 * Props:
 *   icon   — emoji string  (e.g. '🛒')       priority
 *   image  — ignored (kept for API compat)
 *   size   — font size in px  (default 20)
 *   style  — extra style overrides
 *   glow   — glow color override (default COLORS.primaryGlow)
 */
export default function CategoryImage({ icon, image, size = 20, style, glow }) {
  const emoji = icon || '💸';
  const glowColor = glow || COLORS.primaryGlow;

  return (
    <Text
      style={[
        {
          fontSize: size * 0.88,
          lineHeight: size * 1.15,
          textAlign: 'center',
          includeFontPadding: false,
          // Subtle neon glow matching the app palette
          textShadowColor: glowColor,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: size * 0.55,
        },
        style,
      ]}
    >
      {emoji}
    </Text>
  );
}
