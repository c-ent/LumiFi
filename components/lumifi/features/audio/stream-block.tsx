import { colors, fade, radius } from '@/src/theme/tokens';
import { StreamServiceMark } from '@/components/lumifi/shared/stream-marks';
import { parseStreamLink, playbackFor, streamServiceName } from '@/src/core/stream-links';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLumiFi } from '@/components/lumifi/logic';
import { panelStyles as styles } from '@/components/lumifi/shared/panel-styles';
import { useTone } from '@/components/lumifi/features/tone';
import { CloseIcon } from '@/components/lumifi/shared/icons';

/**
 * The "Streaming" part of the Music panel: a field to paste a Spotify /
 * YouTube / Apple Music link, the saved link, and a note about how it works.
 *
 * It doesn't validate or play anything itself. It hands the text to
 * `addStreamLink` (logic.tsx -> src/core/stream-links.ts) and shows the result.
 * Children are rendered between the link list and the note; the desktop card
 * uses that to place the embed slot.
 */

// Messages for the failure results of `addStreamLink`.
const NOTICE = {
  empty: 'Paste a public Spotify, YouTube, YouTube Music, or Apple Music link.',
  unsupported: 'Paste a public Spotify, YouTube, YouTube Music, or Apple Music link.',
  private: 'That link is private or unavailable.',
} as const;

export function StreamBlock({
  mobile = false,
  scrollLinks = false,
  wide = false,
  children,
}: {
  mobile?: boolean;
  scrollLinks?: boolean;
  wide?: boolean;
  children?: React.ReactNode;
}) {
  const {
    streamLinks,
    activeStreamId,
    addStreamLink,
    removeStreamLink,
    openStream,
    closeStream,
  } = useLumiFi();
  const tone = useTone(mobile);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  // "Add" pressed. The save is async (it checks whether the link is private),
  // so a successful add or an already-saved link clears the field and starts
  // playing it; any other result shows a message under the field.
  const submit = () => {
    const pending = draft;
    void addStreamLink(pending).then((result) => {
      if (result === 'added' || result === 'duplicate') {
        // Only clear if the user hasn't typed something new in the meantime.
        setDraft((current) => (current === pending ? '' : current));
        const parsed = parseStreamLink(pending);
        if (parsed.ok) openStream(parsed.link.id);
        setNotice(null);
        return;
      }
      setNotice(NOTICE[result]);
    });
  };

  // One row per saved link (currently at most one). Pressing the row plays it,
  // or stops it if it's the embed already showing. "Open" links (YouTube Music)
  // can't embed, so they always hand off to the other app instead of toggling.
  const links = streamLinks.map((link) => {
    const selected = link.id === activeStreamId;
    const opensOutside = playbackFor(link).kind === 'open';
    const service = streamServiceName(link.service);
    return (
      <View key={link.id} style={[styles.trackRow, wide ? wideStyles.row : null]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityLabel={opensOutside ? `Open ${link.title}` : `Play ${link.title}`}
          onPress={() => (selected && !opensOutside ? closeStream() : openStream(link.id))}
          style={[
            wide ? wideStyles.item : [styles.trackBtn, styles.trackGrow],
            wide
              ? {
                  borderColor: selected ? fade(colors.success, 0.55) : colors.border,
                  backgroundColor: selected ? fade(colors.success, 0.1) : colors.bgCard,
                }
              : { borderColor: selected ? tone.accent : colors.border, backgroundColor: colors.bgCard },
          ]}
        >
          {wide ? (
            <>
              <View style={wideStyles.badge} accessibilityLabel={service}>
                <StreamServiceMark service={link.service} size={22} />
              </View>
              <Text style={styles.taskText} numberOfLines={1}>{link.title}</Text>
            </>
          ) : (
            <>
              <Text style={styles.taskText}>{link.title}</Text>
              <Text style={styles.meta}>{service}</Text>
            </>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${link.title}`}
          onPress={() => removeStreamLink(link.id)}
          style={[styles.trackRemove, wide ? wideStyles.remove : null]}
        >
          <CloseIcon color={colors.textMuted} />
        </Pressable>
      </View>
    );
  });

  // Sets honest expectations: these services play in their own player, and
  // only local tracks keep playing with the screen off.
  const note = (
    <Text style={styles.note}>
      Spotify, YouTube, and Apple Music play in their own player, and it stays on screen when this panel closes. Signed out, Spotify and Apple Music play a short preview. YouTube Music opens in its app. Nothing is downloaded, and with the screen off only your tracks keep playing.
    </Text>
  );

  return (
    <View style={wide ? wideStyles.column : scrollLinks ? styles.streamColumn : undefined}>
      <View style={[styles.addRow, wide ? wideStyles.addRow : null]}>
        <TextInput
          value={draft}
          onChangeText={(value) => {
            setDraft(value);
            setNotice(null);
          }}
          placeholder={wide ? 'Paste a Spotify, YouTube or Apple Music link' : 'Paste a public playlist link'}
          placeholderTextColor={wide ? fade(colors.textPrimary, 0.55) : colors.textMuted}
          accessibilityLabel="Public playlist link"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={[styles.input, wide ? wideStyles.input : { borderColor: colors.border, backgroundColor: colors.bgCard }]}
          onSubmitEditing={submit}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add streaming link"
          style={[styles.solidBtn, wide ? wideStyles.add : null, { backgroundColor: wide ? tone.accent : tone.solid }]}
          onPress={submit}
        >
          <Text style={[styles.solidBtnText, { color: tone.ink }]}>Add</Text>
        </Pressable>
      </View>
      {notice ? <Text style={wide ? [styles.errorText, wideStyles.err] : styles.empty}>{notice}</Text> : null}
      {wide && streamLinks.length > 2 ? (
        <ScrollView style={wideStyles.links}>{links}</ScrollView>
      ) : scrollLinks ? (
        <ScrollView style={styles.streamLinks} contentContainerStyle={styles.streamLinksContent}>
          {links}
        </ScrollView>
      ) : (
        links
      )}
      {children}
      {wide ? null : note}
    </View>
  );
}

const wideStyles = StyleSheet.create({
  column: {
    flex: 1,
    minHeight: 0,
  },
  addRow: {
    marginBottom: 12,
  },
  row: {
    marginBottom: 8,
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: radius.sm,
  },
  badge: {
    flexShrink: 0,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remove: {
    marginBottom: 0,
    borderRadius: radius.sm,
  },
  input: {
    minHeight: 46,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: colors.bgInset,
  },
  add: {
    minHeight: 46,
    paddingHorizontal: 22,
  },
  err: {
    marginTop: 0,
    marginBottom: 8,
  },
  links: {
    maxHeight: 140,
    flexGrow: 0,
    marginBottom: 8,
  },
});
