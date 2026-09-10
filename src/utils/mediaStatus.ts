/** The routine UI uses milliseconds; Expo's current players use seconds. */
export type PlaybackStatus = {
  isLoaded: boolean;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  playableDurationMillis?: number;
  isBuffering: boolean;
  didJustFinish: boolean;
  error?: string;
};
export const milliseconds = (seconds: number) => Math.max(0, Math.round((Number.isFinite(seconds) ? seconds : 0) * 1000));
export const seconds = (millis: number) => Math.max(0, Number.isFinite(millis) ? millis / 1000 : 0);
