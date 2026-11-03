import { musicTracks } from '@/components/music-tracks';
import { colors } from '@/src/theme/tokens';
import Slider from '@react-native-community/slider';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLumiFi } from '@/components/lumifi/logic';
import { NextIcon, PauseIcon, PlayIcon, PrevIcon } from '@/components/lumifi/shared/icons';
import { panelStyles as styles } from '@/components/lumifi/shared/panel-styles';
import { useTone } from '@/components/lumifi/features/tone';

export function MusicBlock({ mobile = false }: { mobile?: boolean }) {
  const lamp = useLumiFi();
  const tone = useTone(mobile);
  const icon = tone.ink;

  return (
    <View>
      <Text style={styles.trackName}>{lamp.trackTitle}</Text>
      <Text style={styles.meta}>{lamp.trackArtist}</Text>
      <View style={styles.transport}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous track" style={styles.round} onPress={lamp.prevTrack}><PrevIcon color={colors.textPrimary} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={lamp.musicPlaying ? 'Pause music' : 'Play music'} style={[styles.roundLg, { backgroundColor: tone.solid }]} onPress={lamp.toggleMusic}>
          {lamp.musicPlaying ? <PauseIcon color={icon} /> : <PlayIcon color={icon} />}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Next track" style={styles.round} onPress={lamp.nextTrack}><NextIcon color={colors.textPrimary} /></Pressable>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={100}
          value={lamp.mix.music}
          onValueChange={(value) => lamp.setMix('music', Math.round(value))}
          minimumTrackTintColor={tone.accent}
          maximumTrackTintColor={colors.border}
          thumbTintColor={tone.accent}
        />
      </View>
      <Text style={styles.kicker}>Playlist</Text>
      {musicTracks.map((track, index) => {
        const selected = index === lamp.trackIndex;
        return (
          <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`Play ${track.title} by ${track.artist}`} key={track.title} onPress={() => lamp.selectTrack(index)} style={[styles.trackBtn, { borderColor: selected ? tone.accent : colors.border, backgroundColor: colors.bgCard }]}>
            <Text style={styles.taskText}>{track.title}</Text>
            <Text style={styles.meta}>{track.artist}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
