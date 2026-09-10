import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackAIWork } from './aiDataLifecycle';

/** Shared by export and deletion; never includes identity, purchases, progress or backend quotas. */
export const isLocalAIDataKey = (key: string): boolean => key.startsWith('@ai_') ||
  key.startsWith('@flexchat_') || key === '@show_flexchat_on_open' ||
  key === '@flexbreak:open_flexchat_after_settings' || key === '@last_notification_processed' ||
  key.startsWith('@rate_limit_voice_transcription_') || key.startsWith('@rate_limit_ai_chat_free_') ||
  key.startsWith('@rate_limit_ai_chat_premium_');

export const exportLocalAIData = () => trackAIWork(async () => {
  const keys = (await AsyncStorage.getAllKeys()).filter(isLocalAIDataKey);
  const values = await AsyncStorage.multiGet(keys);
  const records: Record<string, unknown> = {};
  for (const [key, value] of values) {
    if (value === null) continue;
    try { records[key] = JSON.parse(value); } catch { records[key] = value; }
  }
  return { exportDate: new Date().toISOString(), scope: 'local-device', retainedMetadata: 'Shared diagnostic error counts in @error_metrics are outside this export and are retained on deletion; they may include AI error counts.', records };
});
