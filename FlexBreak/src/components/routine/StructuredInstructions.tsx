import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StructuredInstructionsProps {
  description: string;
  isDark: boolean;
  isSunset: boolean;
  theme: any;
}

// Helper to parse description into structured steps
const parseStretchInstructions = (description: string) => {
  if (!description) return { type: 'simple', instructions: ['No description available'] } as const;

  const sentences = description
    .split('.')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (sentences.length <= 2) {
    return {
      type: 'simple' as const,
      instructions: sentences
    };
  }

  const cueKeywords = ['keep', 'ensure', 'maintain', 'remember', 'avoid', "don't", 'make sure', 'focus'];
  const setupKeywords = ['start', 'begin', 'position', 'place', 'stand', 'sit', 'lie'];

  const setup: string[] = [];
  const execution: string[] = [];
  const cues: string[] = [];

  sentences.forEach(sentence => {
    const lower = sentence.toLowerCase();
    if (setup.length < 2 && setupKeywords.some(k => lower.includes(k))) {
      setup.push(sentence);
    } else if (cueKeywords.some(k => lower.includes(k))) {
      cues.push(sentence);
    } else {
      execution.push(sentence);
    }
  });

  if (setup.length === 0 && execution.length > 1) {
    setup.push(execution.shift()!);
  }

  return {
    type: 'structured' as const,
    setup,
    execution,
    cues
  };
};

const StructuredInstructions: React.FC<StructuredInstructionsProps> = ({ description, isDark, isSunset, theme }) => {
  const parsed = parseStretchInstructions(description);

  if (parsed.type === 'simple') {
    return (
      <View style={styles.simpleContainer}>
        <View style={styles.headerRow}>
          <Ionicons name="information-circle-outline" size={18} color={isDark || isSunset ? theme.accent : '#4CAF50'} />
          <Text style={[styles.headerText, { color: isDark || isSunset ? theme.accent : '#4CAF50' }]}>Instructions</Text>
        </View>
        {parsed.instructions.map((instruction, idx) => (
          <View key={idx} style={styles.simpleItemRow}>
            <View style={[styles.dot, { backgroundColor: isDark || isSunset ? theme.accent : '#4CAF50' }]} />
            <Text style={[styles.simpleItemText, { color: isDark || isSunset ? theme.text : '#333' }]}>{instruction}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View>
      {parsed.setup.length > 0 && (
        <View style={styles.section}>
          <View style={styles.headerRow}>
            <Ionicons name="body-outline" size={18} color={isDark || isSunset ? theme.accent : '#4CAF50'} />
            <Text style={[styles.headerText, { color: isDark || isSunset ? theme.accent : '#4CAF50' }]}>Starting Position</Text>
          </View>
          {parsed.setup.map((step, idx) => (
            <View key={`setup-${idx}`} style={styles.numberRow}>
              <View style={[styles.numberCircle, { backgroundColor: isDark || isSunset ? theme.accent : '#4CAF50' }]}> 
                <Text style={styles.numberText}>{idx + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: isDark || isSunset ? theme.text : '#333' }]}>{step}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Ionicons name="fitness-outline" size={18} color={isDark || isSunset ? theme.accent : '#4CAF50'} />
          <Text style={[styles.headerText, { color: isDark || isSunset ? theme.accent : '#4CAF50' }]}>Movement</Text>
        </View>
        {parsed.execution.map((step, idx) => (
          <View key={`exec-${idx}`} style={styles.numberRow}>
            <View style={[styles.numberCircle, { backgroundColor: isDark || isSunset ? 'rgba(255,255,255,0.2)' : '#E0E0E0' }]}> 
              <Text style={[styles.numberText, { color: isDark || isSunset ? 'white' : '#666' }]}>{parsed.setup.length + idx + 1}</Text>
            </View>
            <Text style={[styles.stepText, { color: isDark || isSunset ? theme.text : '#333' }]}>{step}</Text>
          </View>
        ))}
      </View>

      {parsed.cues.length > 0 && (
        <View style={[styles.cuesContainer, { backgroundColor: isDark || isSunset ? 'rgba(255,255,255,0.05)' : 'rgba(76,175,80,0.05)' }]}> 
          <View style={styles.headerRow}>
            <Ionicons name="alert-circle-outline" size={18} color={isDark || isSunset ? theme.accent : '#4CAF50'} />
            <Text style={[styles.headerText, { color: isDark || isSunset ? theme.accent : '#4CAF50' }]}>Form Tips</Text>
          </View>
          {parsed.cues.map((cue, idx) => (
            <View key={`cue-${idx}`} style={styles.cueRow}>
              <View style={[styles.cueDot, { backgroundColor: isDark || isSunset ? theme.accent : '#4CAF50' }]} />
                <Text style={[styles.cueText, { color: isDark || isSunset ? theme.textSecondary : '#555' }]}>{cue}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  simpleContainer: { marginBottom: 16, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 12, padding: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  headerText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 7, marginRight: 10 },
  simpleItemRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-start', paddingHorizontal: 4 },
  simpleItemText: { flex: 1, fontSize: 16, lineHeight: 22 },
  section: { marginBottom: 16 },
  numberRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start', paddingHorizontal: 4 },
  numberCircle: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 2 },
  numberText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  stepText: { flex: 1, fontSize: 15, lineHeight: 22 },
  cuesContainer: { padding: 12, borderRadius: 12, marginBottom: 12 },
  cueRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  cueDot: { width: 6, height: 6, borderRadius: 3, marginTop: 8, marginRight: 8 },
  cueText: { flex: 1, fontSize: 14, lineHeight: 20, fontStyle: 'italic' }
});

export default StructuredInstructions; 