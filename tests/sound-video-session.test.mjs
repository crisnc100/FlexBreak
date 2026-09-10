import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLoader } from './helpers/load-typescript.mjs';

// Model the installed expo-audio iOS completion/pause contract: players without
// keepAudioSessionActive deactivate the shared session. Physical iOS verification
// remains required; this test protects the real sound-effects -> adapter boundary.
for (const platform of ['ios', 'android']) {
  test(`${platform} sound-effects session policy is scoped and resources still release`, async () => {
    let videoPlaying = true;
    let releases = 0;
    const created = [];
    const assets = {};
    const source = readFileSync(new URL('../src/utils/soundEffects.ts', import.meta.url), 'utf8');
    for (const match of source.matchAll(/import \w+ from '(\.\.\/\.\.\/assets\/sounds\/[^']+)'/g)) assets[match[1]] = 1;
    const load = createLoader({
      globals: { setTimeout: () => 0, clearTimeout: () => {} },
      externalMocks: {
        ...assets,
        'react-native': { Platform: { OS: platform } },
        '@react-native-async-storage/async-storage': { getItem: async () => null, setItem: async () => {} },
        'expo-audio': {
          setAudioModeAsync: async () => {},
          createAudioPlayer: (_source, options) => {
            const end = () => { if (platform === 'ios' && !options.keepAudioSessionActive) videoPlaying = false; };
            const player = {
              isLoaded: true,
              currentStatus: { isLoaded: true, playing: false, currentTime: 0, duration: 1 },
              addListener: () => ({ remove() {} }),
              play() {}, pause: end, finish: end,
              seekTo: async () => {}, remove: () => { releases++; },
            };
            created.push({ options, player });
            return player;
          },
        },
      },
    });
    const effects = load('src/utils/soundEffects.ts');
    await effects.playTimerTheme2Sound();
    assert.equal(created.length, 1);
    assert.equal(created[0].options.keepAudioSessionActive, platform === 'ios');
    created[0].player.finish();
    created[0].player.pause();
    assert.equal(videoPlaying, true, 'countdown sound completion/pause must not interrupt video');
    await effects.unloadAllSounds();
    assert.equal(releases, 1);

    // Demo/other adapter users retain the library default, not the effect policy.
    const { Sound } = load('src/utils/nativeAudio.ts');
    const { sound } = await Sound.createAsync(2);
    assert.equal(created[1].options.keepAudioSessionActive, false);
    await sound.unloadAsync();
    await sound.unloadAsync();
    assert.equal(releases, 2);
  });
}
