import { useEffect, useState } from 'react';

import {
  getTrackFromPool,
  subscribeAppConfig,
  subscribeChannelState,
  subscribeTrackPool,
} from '../channel/channelClient';
import type { AppConfig, ChannelState, Track } from '../types';

export function useChannelState(): ChannelState | null {
  const [state, setState] = useState<ChannelState | null>(null);
  useEffect(() => subscribeChannelState(setState), []);
  return state;
}

export function useAppConfig(): AppConfig {
  const [config, setConfig] = useState<AppConfig>({ isLive: true, chatEnabled: true });
  useEffect(() => subscribeAppConfig(setConfig), []);
  return config;
}

export function useCurrentTrack(state: ChannelState | null): Track | null {
  const [track, setTrack] = useState<Track | null>(null);
  useEffect(() => {
    if (!state) return;
    setTrack(getTrackFromPool(state.currentTrackId));
    // Re-resolve if the pool hydrates after the first state emission.
    return subscribeTrackPool(() => setTrack(getTrackFromPool(state.currentTrackId)));
  }, [state?.currentTrackId]);
  return track;
}
