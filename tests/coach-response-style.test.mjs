import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoader } from './helpers/load-typescript.mjs';

function harness(language = 'en', reply = 'Take a quiet break. Try one small task afterward.') {
  const values = new Map();
  const calls = [];
  const load = createLoader({ externalMocks: {
    '@env': {},
    '@react-native-async-storage/async-storage': {
      getItem: async key => values.get(key) ?? null,
      setItem: async (key, value) => values.set(key, value),
    },
  }, mocks: {
    'src/services/storageService': { getIsPremium: async () => true, getTransitionDuration: async () => 10,
      KEYS: { AI_WELLNESS: { USER_NAME: 'coach-name' } } },
    'src/services/ai/aiDataLifecycle': { trackAIWork: callback => callback() },
    'src/services/ai/integrations/secureAIService': { __esModule: true, default: { chat: async (messages, options) => {
      calls.push({ messages, options }); return reply;
    } } },
    'src/services/ai/contextBuilder': {
      buildUserContext: async () => ({ detectedLanguage: language, timeOfDay: 'afternoon', isFirstInteraction: true }),
      detectLanguage: () => language, categorizeInput: () => 'general',
    },
    'src/services/ai/memory/memoryService': {
      __esModule: true,
      default: { buildContext: async () => '', extractAndStore: async () => {} },
      simpleMemory: { getMemory: async () => ({ usage: { totalInteractions: 0, weeklyCount: 0 } }), updateMemory: async () => {} },
    },
    'src/services/ai/utils/costMonitor': { __esModule: true, default: { canMakeRequest: async () => true, trackUsage: async () => {} } },
    'src/services/security/configValidator': {},
    'src/services/ai/utils/reliabilityService': { errorHandler: { handleError: async error => { throw error; } } },
    'src/utils/progress/modules/rewardManager': { isRewardUnlocked: async () => true },
  } });
  // Real service, prompt builder, conversation formatter, mode detector and config.
  const service = load('src/services/ai/core/aiWellnessService.ts').default;
  return { calls, ask: input => service.processWellnessCheckIn(input, 'test-user') };
}

const localized = [
  { language: 'en', input: 'I slept badly and cannot concentrate today.',
    reply: 'Take a quiet break. Try one small task afterward.', brief: /2–4 short sentences/, bullets: /at most 3 short bullets/,
    injury: 'I have severe pain.', safety: /consult a qualified professional/ },
  { language: 'es', input: 'Dormí mal y no puedo concentrarme hoy.',
    reply: 'Haz una pausa tranquila. Después intenta una tarea pequeña.', brief: /2–4 frases cortas/, bullets: /como máximo 3 viñetas cortas/,
    injury: 'Tengo dolor severo.', safety: /consulta a un profesional/ },
  { language: 'zh', input: '我昨晚没睡好，今天无法集中注意力。',
    reply: '先安静休息一会儿。然后尝试完成一件小事。', brief: /2–4 句短句/, bullets: /最多 3 条简短要点/,
    injury: '我有剧痛。', safety: /请停止并咨询专业人士/ },
];

for (const example of localized) {
  test(`ordinary ${example.language} coach request sends brief guidance and keeps a short reply out of workout formatting`, async () => {
    const h = harness(example.language, example.reply);
    const result = await h.ask(example.input);
    assert.equal(h.calls.length, 1);
    const prompt = h.calls[0].messages[0].content;
    assert.match(prompt, example.brief);
    assert.match(prompt, example.bullets);
    assert.doesNotMatch(prompt, /6–9|160–220/);
    assert.equal(h.calls[0].messages[1].content, example.input);
    assert.equal(h.calls[0].options.maxTokens, 300);
    assert.equal(result.response.replace(/\s+/g, ' '), example.reply);
    assert.doesNotMatch(result.response, /•/);
    assert.equal(result.routineParams, undefined);
  });

  test(`brief ${example.language} response retains localized safety footer`, async () => {
    const h = harness(example.language, example.reply);
    const result = await h.ask(example.injury);
    assert.equal(h.calls.length, 1);
    assert.match(result.response, example.safety);
    assert.ok(result.response.startsWith(example.reply.split(/[.。]/)[0]));
  });
}

test('explicit workout keeps its plan prompt, bullet formatting and token allowance', async () => {
  const h = harness('en', 'Warm up gently. Do five squats. Cool down slowly.');
  const result = await h.ask('Give me a workout.');
  assert.equal(h.calls.length, 1);
  assert.match(h.calls[0].messages[0].content, /6–10 bullets/);
  assert.doesNotMatch(h.calls[0].messages[0].content, /at most 3 short bullets/);
  assert.equal(h.calls[0].options.maxTokens, 300);
  assert.match(result.response, /• Do five squats\./);
  assert.match(result.response, /• Cool down slowly\./);
});

test('explicit stretch still returns a local playable routine without a model request', async () => {
  const h = harness();
  const result = await h.ask('Give me one quick desk stretch');
  assert.equal(h.calls.length, 0);
  assert.ok(result.routineParams?.customStretches?.length);
  assert.match(result.response, /Start Routine/);
});
