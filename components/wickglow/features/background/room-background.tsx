import React from 'react';
import type { VideoId } from '@/components/wickglow/domain/video-ids';
import { Crossfade } from '@/components/wickglow/features/background/crossfade';
import { FillGradient } from '@/components/wickglow/features/background/fill-gradient';
import { SelectedVideoBackground } from '@/components/wickglow/features/background/selected-video-background';
import { useWickglow } from '@/components/wickglow/logic';
import { MOODS, MoodTheme } from '@/components/wickglow/theme';

/**
 * The phone and tablet backdrop: the mood gradient, or on tablet the chosen
 * video. Switching mood or turning the video on or off swaps at once, with
 * no transition (see crossfade.tsx). Phones pass `video={false}`, since they never play one.
 */
export function RoomBackground({ video = true }: { video?: boolean }) {
  const { moodTheme, videoBg } = useWickglow();
  const look = video && videoBg ? `video:${videoBg}` : `mood:${moodTheme.id}`;
  return (
    <Crossfade
      id={look}
      render={(id, onReady) => {
        const [kind, value] = id.split(':') as [string, string];
        if (kind === 'video') return <SelectedVideoBackground id={value as VideoId} onReady={onReady} />;
        return <MoodGradient mood={MOODS.find((item) => item.id === value) ?? moodTheme} onReady={onReady} />;
      }}
    />
  );
}

function MoodGradient({ mood, onReady }: { mood: MoodTheme; onReady: () => void }) {
  // Ready once FillGradient has measured itself and drawn.
  return (
    <FillGradient
      onReady={onReady}
      // Two moods can be mounted while switching, so each gradient id is unique.
      id={`room-${mood.id}`}
      stops={[
        { offset: '0', color: mood.bgBase },
        { offset: '0.58', color: mood.bgMid },
        { offset: '1', color: mood.bgGlow },
      ]}
    />
  );
}
