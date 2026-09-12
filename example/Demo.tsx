import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GrainGradient, MeshGradient, grainGradientPresets, meshGradientPresets } from 'react-native-skia-shaders';

export default function Demo() {
  const [mesh, setMesh] = useState(0);
  const [grain, setGrain] = useState(0);
  const m = meshGradientPresets[mesh]!;
  const g = grainGradientPresets[grain]!;
  return (
    <ScrollView contentContainerStyle={styles.page} testID="demo">
      <Text style={styles.h}>MeshGradient · {m.name}</Text>
      <MeshGradient style={styles.card} {...m.params}>
        <Text style={styles.overlay}>Children render on top</Text>
      </MeshGradient>
      <Row items={meshGradientPresets.map((p) => p.name)} active={mesh} onPick={setMesh} />

      <Text style={styles.h}>GrainGradient · {g.name}</Text>
      <GrainGradient style={styles.card} {...g.params} />
      <Row items={grainGradientPresets.map((p) => p.name)} active={grain} onPick={setGrain} />
    </ScrollView>
  );
}

function Row({ items, active, onPick }: { items: string[]; active: number; onPick: (i: number) => void }) {
  return (
    <View style={styles.row}>
      {items.map((name, i) => (
        <Pressable key={name} onPress={() => onPick(i)} style={[styles.chip, i === active && styles.chipOn]}>
          <Text style={[styles.chipText, i === active && styles.chipTextOn]}>{name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 12, backgroundColor: '#111', minHeight: '100%' },
  h: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 12 },
  card: { height: 240, borderRadius: 16, overflow: 'hidden', justifyContent: 'flex-end', padding: 16 },
  overlay: { color: '#fff', fontWeight: '600', textShadow: '0 0 6px #0008' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#222' },
  chipOn: { backgroundColor: '#fff' },
  chipText: { color: '#ccc' },
  chipTextOn: { color: '#111' },
});
