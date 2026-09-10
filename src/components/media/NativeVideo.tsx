import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { VideoView, useVideoPlayer, type VideoSource } from 'expo-video';
import type { StyleProp, ViewStyle } from 'react-native';
import { milliseconds, seconds, type PlaybackStatus } from '../../utils/mediaStatus';

export type AVPlaybackStatus = PlaybackStatus;
export const ResizeMode = { CONTAIN: 'contain', COVER: 'cover', STRETCH: 'fill' } as const;
export interface Video {
  setIsMutedAsync(muted: boolean): Promise<PlaybackStatus>;
  getStatusAsync(): Promise<PlaybackStatus>;
  playAsync(): Promise<PlaybackStatus>;
  pauseAsync(): Promise<PlaybackStatus>;
  setPositionAsync(position: number): Promise<PlaybackStatus>;
  loadAsync(source: VideoSource): Promise<PlaybackStatus>;
  unloadAsync(): Promise<PlaybackStatus>;
}
type Props = {
  source: VideoSource; style?: StyleProp<ViewStyle>; resizeMode?: 'contain' | 'cover' | 'fill';
  shouldPlay?: boolean; isLooping?: boolean; isMuted?: boolean; volume?: number;
  useNativeControls?: boolean; positionMillis?: number; progressUpdateIntervalMillis?: number;
  onLoadStart?: () => void; onLoad?: (status: PlaybackStatus) => void; onReadyForDisplay?: () => void;
  onError?: (error: string) => void; onPlaybackStatusUpdate?: (status: PlaybackStatus) => void;
};

export const Video = forwardRef<Video, Props>(function NativeVideo(props, ref) {
  const callbacks = useRef(props);
  callbacks.current = props;
  const player = useVideoPlayer(null);
  const loaded = useRef(false);
  const status = (finished = false): PlaybackStatus => ({
    isLoaded: loaded.current, isPlaying: player.playing,
    positionMillis: milliseconds(player.currentTime), durationMillis: milliseconds(player.duration),
    playableDurationMillis: milliseconds(player.bufferedPosition),
    isBuffering: player.status === 'loading', didJustFinish: finished,
  });
  // A stable URI key prevents newly allocated {uri} props from restarting playback.
  const sourceKey = JSON.stringify(props.source);
  useEffect(() => {
    const publish = (finished = false) => callbacks.current.onPlaybackStatusUpdate?.(status(finished));
    const subscriptions = [
      player.addListener('sourceLoad', () => {
        loaded.current = true;
        if (callbacks.current.positionMillis !== undefined) player.currentTime = seconds(callbacks.current.positionMillis);
        callbacks.current.onLoad?.(status());
        if (callbacks.current.shouldPlay) player.play();
        publish();
      }),
      player.addListener('statusChange', event => {
        if (event.status === 'error') {
          loaded.current = false;
          callbacks.current.onError?.(event.error?.message ?? 'Video playback failed');
        }
        publish();
      }),
      player.addListener('playingChange', () => publish()),
      player.addListener('timeUpdate', () => publish()),
      player.addListener('playToEnd', () => publish(true)),
    ];
    return () => subscriptions.forEach(subscription => subscription.remove());
    // player is managed and released by useVideoPlayer; callbacks are read through ref.
  }, [player]);
  useEffect(() => {
    loaded.current = false;
    callbacks.current.onLoadStart?.();
    let active = true;
    void player.replaceAsync(JSON.parse(sourceKey)).catch(error => { if (active) callbacks.current.onError?.(String(error)); });
    return () => { active = false; };
  }, [player, sourceKey]);
  useEffect(() => { player.loop = props.isLooping ?? false; }, [player, props.isLooping]);
  useEffect(() => { player.muted = props.isMuted ?? false; }, [player, props.isMuted]);
  useEffect(() => { player.volume = props.volume ?? 1; }, [player, props.volume]);
  useEffect(() => { player.timeUpdateEventInterval = (props.progressUpdateIntervalMillis ?? 500) / 1000; }, [player, props.progressUpdateIntervalMillis]);
  useEffect(() => { if (props.shouldPlay) player.play(); else player.pause(); }, [player, props.shouldPlay]);
  useImperativeHandle(ref, () => ({
    setIsMutedAsync: async muted => { player.muted = muted; return status(); },
    getStatusAsync: async () => status(),
    playAsync: async () => { player.play(); return status(); },
    pauseAsync: async () => { player.pause(); return status(); },
    setPositionAsync: async position => { player.currentTime = seconds(position); return status(); },
    loadAsync: async source => { loaded.current = false; callbacks.current.onLoadStart?.(); await player.replaceAsync(source); return status(); },
    unloadAsync: async () => { player.pause(); loaded.current = false; await player.replaceAsync(null); return status(); },
  }));
  return <VideoView player={player} style={props.style} contentFit={props.resizeMode ?? 'contain'}
    nativeControls={props.useNativeControls ?? false} onFirstFrameRender={() => callbacks.current.onReadyForDisplay?.()} />;
});
