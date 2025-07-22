// Supabase Edge Functions configuration
export const SUPABASE_PROJECT_URL = 'https://tkudukjujfztyiqijvjn.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrdWR1a2p1amZ6dHlpcWlqdmpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNDk1MzEsImV4cCI6MjA2ODcyNTUzMX0.n11xCcR18IJ7o9t1RD7w7TmakC7ZvlVcNjSbibCTBfg';

// Edge Function endpoints
export const EDGE_FUNCTIONS = {
  AI_CHAT: `${SUPABASE_PROJECT_URL}/functions/v1/ai-chat-firebase`,
  SPEECH_TRANSCRIPTION: `${SUPABASE_PROJECT_URL}/functions/v1/transcribe-audio`,
  EMAIL_VERIFICATION: `${SUPABASE_PROJECT_URL}/functions/v1/verify-email`,
  SAVE_REMINDERS: `${SUPABASE_PROJECT_URL}/functions/v1/save-reminders`,
};