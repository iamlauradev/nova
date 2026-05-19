import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ScrollView, StyleSheet,
} from 'react-native';
import { COLORS } from '../theme';

// Sugerencias agrupadas — basta con unos 120 emoji bien escogidos
const EMOJI_GROUPS = [
  {
    label: 'Finanzas',
    emojis: ['💰','💵','💶','💷','💸','🪙','💳','🏦','📈','📉','📊','💹','🏧','🤑','💎','🏆','👑','🎯'],
  },
  {
    label: 'Alimentación',
    emojis: ['🛒','🍽️','🍔','🍕','🌮','🍣','🥗','🥩','🥐','🍞','☕','🧋','🥤','🍺','🍷','🥃','🍫','🍰'],
  },
  {
    label: 'Transporte',
    emojis: ['🚗','🚕','🏍️','🛵','🚌','🚇','✈️','🚢','🚲','🛴','⛽','🅿️','🔧','🛡️','🗺️','🧭'],
  },
  {
    label: 'Hogar',
    emojis: ['🏠','🛋️','🛏️','🪴','🧹','🔌','💡','🪣','🪟','🚿','🛁','🧴','🧻','🗑️','🔑','🪤'],
  },
  {
    label: 'Salud',
    emojis: ['🏥','💊','🩺','🩹','🧬','🦷','💪','🧘','🏃','🥗','🫀','🧠','👁️','🩻','🌡️','🧪'],
  },
  {
    label: 'Ocio',
    emojis: ['🎮','🎬','🎵','🎸','🎨','📚','⚽','🎾','🏊','🎭','🎲','🎳','🎠','🎡','🎢','🃏'],
  },
  {
    label: 'Ropa & Moda',
    emojis: ['👕','👗','👔','👟','👠','👜','🧣','🧤','🕶️','💍','💄','🪮','🧴','🎀','👒','🧢'],
  },
  {
    label: 'Tecnología',
    emojis: ['💻','📱','⌨️','🖥️','🖨️','📷','🔋','🔌','🤖','👾','🎧','📡','🛰️','⌚','📺','🕹️'],
  },
  {
    label: 'Viajes',
    emojis: ['✈️','🧳','🏖️','🏕️','🗺️','🌍','🏔️','🚀','🛳️','🏨','🎫','📸','🌅','🌄','🗽','🗼'],
  },
  {
    label: 'Familia & Social',
    emojis: ['👨‍👩‍👧','❤️','🤝','🎁','🎂','🎉','🙏','💌','📞','👶','🐣','🎓','💒','⛪','🏫','🌸'],
  },
  {
    label: 'Mascotas',
    emojis: ['🐶','🐱','🐠','🐹','🐰','🦜','🐾','🦴','🪺','🐾','🌿','🌱','🌻','🍃','🐾','🪷'],
  },
  {
    label: 'Misc',
    emojis: ['⭐','🔥','⚡','💥','🎯','🔮','🪄','⚙️','🔑','🗝️','📌','📎','🪝','🧲','🔒','🛠️'],
  },
];

/**
 * EmojiPicker
 *
 * Props:
 *   selected   string   current emoji
 *   onSelect   fn(emoji)
 */
export default function EmojiPicker({ selected, onSelect }) {
  const [custom, setCustom] = useState('');

  const handleCustomChange = (v) => {
    setCustom(v);
    // Extract just the first grapheme cluster (emoji)
    const trimmed = [...v.trim()][0];
    if (trimmed) onSelect(trimmed);
  };

  return (
    <View style={styles.root}>
      {/* Preview + free input */}
      <View style={styles.inputRow}>
        <View style={styles.previewBox}>
          <Text style={styles.previewEmoji}>{selected || '❓'}</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Escribe o pega un emoji…"
          placeholderTextColor={COLORS.textDim}
          value={custom}
          onChangeText={handleCustomChange}
          maxLength={8}
        />
      </View>

      {/* Grouped suggestions */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {EMOJI_GROUPS.map(group => (
          <View key={group.label} style={styles.group}>
            <Text style={styles.groupLabel}>{group.label.toUpperCase()}</Text>
            <View style={styles.grid}>
              {group.emojis.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.emojiBtn, selected === emoji && styles.emojiBtnSelected]}
                  onPress={() => { onSelect(emoji); setCustom(''); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 12,
  },
  previewBox: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: `${COLORS.primary}18`,
    borderWidth: 1, borderColor: `${COLORS.primary}50`,
    alignItems: 'center', justifyContent: 'center',
  },
  previewEmoji: { fontSize: 24 },
  input: {
    flex: 1, height: 44,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 12,
    color: COLORS.text, fontSize: 14,
  },

  scroll: { maxHeight: 280 },

  group: { marginBottom: 12 },
  groupLabel: {
    color: COLORS.textDim, fontSize: 9, fontWeight: '700',
    letterSpacing: 2, marginBottom: 6,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },

  emojiBtn: {
    width: 40, height: 40, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
  },
  emojiBtnSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}22`,
  },
  emoji: { fontSize: 20 },
});
