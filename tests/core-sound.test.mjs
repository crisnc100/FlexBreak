import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { createLoader } from './helpers/load-typescript.mjs';

test('sound startup configures native interruption policy once', async () => {
  const configurations = [];
  // Metro normally turns bundled audio files into resource identifiers.
  const mocks = Object.fromEntries(readdirSync(new URL('../assets/sounds/', import.meta.url))
    .filter(name => name.endsWith('.mp3')).map((name, index) => [`assets/sounds/${name}`, index + 1]));
  const load = createLoader({ mocks, externalMocks: {
    'expo-audio': { setAudioModeAsync: async config => { configurations.push(config); } },
    'react-native': { Platform: { OS: 'ios' } },
    '@react-native-async-storage/async-storage': { getItem: async () => 'false' },
  } });
  const sound = load('src/utils/soundEffects.ts');
  await sound.initSoundSystem();
  await sound.initSoundSystem();
  assert.equal(configurations.length, 1);
  assert.equal(configurations[0].interruptionMode, 'doNotMix');
  assert.equal(configurations[0].playsInSilentMode, true);
  assert.equal(sound.isSoundEnabled(), false);
});
