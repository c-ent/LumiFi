import { isOverdue, parseDueDate } from '@/src/core/tasks';
import { colors, fade, fonts, rounded } from '@/src/theme/tokens';
import React, { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLumiFi } from '@/components/lumifi/logic';
import { useTone } from '@/components/lumifi/features/tone';
import { CalendarIcon, ChevronIcon, CloseIcon, PencilIcon, TargetIcon, TrashIcon } from '@/components/lumifi/shared/icons';

const dueFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const iconSlop = { top: 10, bottom: 10, left: 6, right: 6 };

const hiddenDate: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  bottom: 0,
  width: '100%',
  height: '100%',
  opacity: 0,
  pointerEvents: 'none',
  border: 0,
  padding: 0,
  colorScheme: 'dark',
};

function formatDue(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return dueFormatter.format(new Date(year, month - 1, day));
}

function openPicker(input: HTMLInputElement | null) {
  if (!input) return;
  try {
    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }
  } catch {
    // The browser refuses showPicker outside a user gesture. Fall through to a click.
  }
  input.focus();
  input.click();
}

function dateColor(value: string, overdue: boolean, accent: string, compact: boolean): string {
  if (!value) return fade(colors.textPrimary, 0.45);
  if (compact && overdue) return colors.flame2;
  if (compact) return colors.textMuted;
  return accent;
}

function DueControl({
  value,
  onChange,
  accent,
  label,
  compact = false,
  overdue = false,
}: {
  value: string;
  onChange: (value: string) => void;
  accent: string;
  label: string;
  compact?: boolean;
  overdue?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const shown = value && parseDueDate(value) ? formatDue(value) : '';
  const color = dateColor(value, overdue, accent, compact);

  if (Platform.OS !== 'web') {
    return (
      <TextInput
        value={focused ? draft : value}
        onFocus={() => {
          setDraft(value);
          setFocused(true);
        }}
        onChangeText={setDraft}
        onEndEditing={(event) => {
          setFocused(false);
          onChange(event.nativeEvent.text.trim());
        }}
        placeholder={compact ? 'Date' : 'YYYY-MM-DD'}
        placeholderTextColor={fade(colors.textPrimary, 0.45)}
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        style={[compact ? styles.nativeDate : styles.nativeAddDate, { color }]}
      />
    );
  }

  return (
    <View style={compact ? styles.dateSlot : styles.addDate}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => openPicker(inputRef.current)}
        style={compact ? styles.dateBtn : [styles.calBtn, value ? { borderColor: fade(accent, 0.5) } : null]}
      >
        {shown ? (
          <Text style={[compact ? styles.dateText : styles.calText, { color }]} numberOfLines={1}>{shown}</Text>
        ) : (
          <CalendarIcon size={compact ? 14 : 16} color={fade(colors.textPrimary, 0.45)} />
        )}
      </Pressable>
      <input
        ref={inputRef}
        type="date"
        value={value}
        tabIndex={-1}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        style={hiddenDate}
      />
    </View>
  );
}

function CheckBox({ on, accent, label, small = false, onPress }: {
  on: boolean;
  accent: string;
  label: string;
  small?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={small ? iconSlop : undefined}
      style={[
        styles.check,
        small ? styles.checkSm : null,
        { borderColor: on ? accent : fade(colors.textPrimary, 0.35), backgroundColor: on ? accent : 'transparent' },
      ]}
    >
      {on ? <View style={small ? styles.tickSm : styles.tick} /> : null}
    </Pressable>
  );
}

// The target beside a task title. It marks the focused task, so the state is
// visible as a control rather than only through the row's tint.
function FocusButton({ on, accent, label, onPress }: {
  on: boolean;
  accent: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={iconSlop}
      style={[styles.iconBtn, on ? { backgroundColor: fade(accent, 0.16) } : null]}
    >
      <TargetIcon size={16} color={on ? accent : fade(colors.textPrimary, 0.45)} />
    </Pressable>
  );
}

function IconButton({ label, onPress, children }: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={iconSlop}
      style={({ pressed }) => [styles.iconBtn, pressed ? { backgroundColor: 'rgba(255, 255, 255, 0.06)' } : null]}
    >
      {children}
    </Pressable>
  );
}

export function TaskList({ mobile = false }: { mobile?: boolean }) {
  const lamp = useLumiFi();
  const tone = useTone(mobile);
  const [text, setText] = useState('');
  const [date, setDate] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [subDraft, setSubDraft] = useState<Record<number, string>>({});
  const [focusSub, setFocusSub] = useState<number | null>(null);
  const editingRef = useRef<number | null>(null);
  const editValue = useRef('');
  const accent = tone.accent;
  const parents = lamp.tasks.filter((task) => task.parentId == null);
  const ordered = parents.filter((task) => !task.done).concat(parents.filter((task) => task.done));
  const hasOpen = parents.some((task) => !task.done);

  function beginEdit(id: number, current: string) {
    editingRef.current = id;
    editValue.current = current;
    setEditingId(id);
  }

  function commitEdit(id: number, value: string, keep: boolean) {
    if (editingRef.current !== id) return;
    editingRef.current = null;
    setEditingId(null);
    if (keep) lamp.renameTask(id, value);
  }

  function add() {
    lamp.addTask(text, date || null);
    setText('');
    setDate('');
  }

  function addSub(parentId: number) {
    const draft = subDraft[parentId] ?? '';
    if (!draft.trim()) return;
    lamp.addSubtask(parentId, draft);
    setSubDraft((current) => ({ ...current, [parentId]: '' }));
  }

  return (
    <View>
      <View style={styles.add}>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={add}
          placeholder="What are you studying?"
          placeholderTextColor={fade(colors.textPrimary, 0.4)}
          accessibilityLabel="Task"
          maxLength={200}
          style={styles.field}
        />
        <DueControl
          value={date}
          onChange={setDate}
          accent={accent}
          label={date ? 'Change due date' : 'Add a due date'}
        />
        {date ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Remove date" onPress={() => setDate('')} hitSlop={iconSlop} style={styles.clearDate}>
            <CloseIcon size={14} color={colors.textMuted} />
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Add task" onPress={add} style={[styles.addBtn, { backgroundColor: accent }]}>
          <Text style={[styles.addBtnText, { color: tone.ink }]}>Add</Text>
        </Pressable>
      </View>

      {ordered.length === 0 ? (
        <Text style={styles.empty}>No tasks yet. Add your first one above.</Text>
      ) : (
        <View style={styles.list}>
          {ordered.map((task) => {
            const subs = lamp.tasks.filter((item) => item.parentId === task.id);
            const doneCount = subs.filter((item) => item.done).length;
            const overdue = isOverdue(task.date, lamp.now);
            const active = lamp.activeTask?.id === task.id && !task.done;
            return (
              <View
                key={task.id}
                style={[
                  styles.item,
                  active ? { borderColor: fade(accent, 0.7), backgroundColor: fade(accent, 0.07) } : null,
                ]}
              >
                <View style={styles.row}>
                  <CheckBox
                    on={task.done}
                    accent={accent}
                    label={task.done ? `Mark ${task.text} not done` : `Mark ${task.text} done`}
                    onPress={() => lamp.toggleTask(task.id)}
                  />
                  {editingId === task.id ? (
                    <TextInput
                      defaultValue={task.text}
                      autoFocus
                      selectTextOnFocus
                      maxLength={200}
                      accessibilityLabel={`Edit ${task.text}`}
                      onChangeText={(value) => { editValue.current = value; }}
                      onSubmitEditing={() => commitEdit(task.id, editValue.current, true)}
                      onBlur={() => commitEdit(task.id, editValue.current, true)}
                      onKeyPress={(event) => {
                        if (event.nativeEvent.key === 'Enter') commitEdit(task.id, editValue.current, true);
                        if (event.nativeEvent.key === 'Escape') commitEdit(task.id, '', false);
                      }}
                      style={styles.edit}
                    />
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={active ? `Stop focusing on ${task.text}` : `Focus on ${task.text}`}
                      disabled={task.done}
                      onPress={() => lamp.focusTask(task.id)}
                      style={styles.titleBtn}
                    >
                      <Text style={[styles.title, task.done ? styles.done : null]} numberOfLines={1}>{task.text}</Text>
                    </Pressable>
                  )}
                  {task.done ? null : (
                    <DueControl
                      value={task.date ?? ''}
                      onChange={(next) => lamp.setTaskDate(task.id, next || null)}
                      accent={accent}
                      compact
                      overdue={overdue}
                      label={task.date ? `Change due date for ${task.text}` : `Add a due date to ${task.text}`}
                    />
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: task.open }}
                    accessibilityLabel={subs.length > 0 ? `Subtasks for ${task.text}, ${doneCount} of ${subs.length} done` : `Add a subtask to ${task.text}`}
                    onPress={() => {
                      if (!task.open) setFocusSub(task.id);
                      lamp.setTaskOpen(task.id, !task.open);
                    }}
                    hitSlop={iconSlop}
                    style={[styles.subBtn, subs.length > 0 ? styles.subBtnOn : null]}
                  >
                    <Text style={styles.subBtnText}>{subs.length > 0 ? `${doneCount}/${subs.length}` : '+ Sub'}</Text>
                    {subs.length > 0 ? (
                      <View style={task.open ? styles.chevOpen : null}>
                        <ChevronIcon size={10} color={fade(colors.textPrimary, 0.45)} />
                      </View>
                    ) : null}
                  </Pressable>
                  {task.done ? null : (
                    <FocusButton
                      on={active}
                      accent={accent}
                      label={active ? `Stop focusing on ${task.text}` : `Focus on ${task.text}`}
                      onPress={() => lamp.focusTask(task.id)}
                    />
                  )}
                  {task.done ? null : (
                    <IconButton label={`Edit ${task.text}`} onPress={() => beginEdit(task.id, task.text)}>
                      <PencilIcon size={14} color={fade(colors.textPrimary, 0.45)} />
                    </IconButton>
                  )}
                  <IconButton label={`Delete ${task.text}`} onPress={() => lamp.removeTask(task.id)}>
                    <TrashIcon size={14} color={fade(colors.textPrimary, 0.45)} />
                  </IconButton>
                </View>
                {task.open ? (
                  <View style={styles.subs}>
                    {subs.map((sub) => (
                      <View key={sub.id} style={styles.sub}>
                        <CheckBox
                          on={sub.done}
                          accent={accent}
                          small
                          label={sub.done ? `Mark ${sub.text} not done` : `Mark ${sub.text} done`}
                          onPress={() => lamp.toggleTask(sub.id)}
                        />
                        {editingId === sub.id ? (
                          <TextInput
                            defaultValue={sub.text}
                            autoFocus
                            selectTextOnFocus
                            maxLength={200}
                            accessibilityLabel={`Edit ${sub.text}`}
                            onChangeText={(value) => { editValue.current = value; }}
                            onSubmitEditing={() => commitEdit(sub.id, editValue.current, true)}
                            onBlur={() => commitEdit(sub.id, editValue.current, true)}
                            onKeyPress={(event) => {
                              if (event.nativeEvent.key === 'Enter') commitEdit(sub.id, editValue.current, true);
                              if (event.nativeEvent.key === 'Escape') commitEdit(sub.id, '', false);
                            }}
                            style={[styles.edit, styles.editSm]}
                          />
                        ) : (
                          <Text style={[styles.subTitle, sub.done ? styles.done : null]} numberOfLines={1}>{sub.text}</Text>
                        )}
                        {sub.done ? null : (
                          <IconButton label={`Edit ${sub.text}`} onPress={() => beginEdit(sub.id, sub.text)}>
                            <PencilIcon size={14} color={fade(colors.textPrimary, 0.45)} />
                          </IconButton>
                        )}
                        <IconButton label={`Delete ${sub.text}`} onPress={() => lamp.removeTask(sub.id)}>
                          <TrashIcon size={14} color={fade(colors.textPrimary, 0.45)} />
                        </IconButton>
                      </View>
                    ))}
                    <View style={styles.subAdd}>
                      <TextInput
                        value={subDraft[task.id] ?? ''}
                        onChangeText={(value) => setSubDraft((current) => ({ ...current, [task.id]: value }))}
                        onSubmitEditing={() => addSub(task.id)}
                        placeholder="Add a subtask"
                        placeholderTextColor={fade(colors.textPrimary, 0.4)}
                        accessibilityLabel={`Add a subtask to ${task.text}`}
                        autoFocus={focusSub === task.id}
                        maxLength={200}
                        style={styles.subField}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Add subtask to ${task.text}`}
                        onPress={() => addSub(task.id)}
                        style={[styles.subAddBtn, { backgroundColor: fade(accent, 0.15) }]}
                      >
                        <Text style={[styles.subAddText, { color: accent }]}>Add</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
      {hasOpen ? (
        <View style={styles.hintRow}>
          <TargetIcon size={14} color={fade(colors.textPrimary, 0.4)} />
          <Text style={styles.hint}>Click a task to focus on it. It shows under the timer.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  field: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgInset,
    ...rounded(12),
    paddingHorizontal: 14,
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  addDate: {
    position: 'relative',
    flexShrink: 0,
  },
  calBtn: {
    minWidth: 46,
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgInset,
    ...rounded(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  calText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
  },
  nativeAddDate: {
    width: 118,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgInset,
    ...rounded(12),
    paddingHorizontal: 10,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  clearDate: {
    minWidth: 28,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    minHeight: 44,
    paddingHorizontal: 20,
    ...rounded(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
  },
  list: {
    marginTop: 16,
    gap: 6,
  },
  item: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    ...rounded(12),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 6,
  },
  check: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    ...rounded(6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSm: {
    width: 17,
    height: 17,
    borderRadius: 5,
  },
  tick: {
    width: 5,
    height: 9,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.textInverse,
    transform: [{ rotate: '45deg' }, { translateY: -1 }],
  },
  tickSm: {
    width: 4,
    height: 8,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.textInverse,
    transform: [{ rotate: '45deg' }, { translateY: -1 }],
  },
  titleBtn: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 2,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  done: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  edit: {
    flex: 1,
    minWidth: 0,
    minHeight: 32,
    borderWidth: 1,
    borderColor: fade(colors.accent, 0.6),
    backgroundColor: colors.bgInset,
    ...rounded(8),
    paddingHorizontal: 10,
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  editSm: {
    fontSize: 13,
    minHeight: 30,
  },
  dateSlot: {
    position: 'relative',
    flexShrink: 0,
  },
  dateBtn: {
    borderWidth: 1,
    borderColor: 'transparent',
    ...rounded(8),
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
  nativeDate: {
    width: 96,
    minHeight: 32,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgInset,
    ...rounded(8),
    paddingHorizontal: 8,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  subBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'transparent',
    ...rounded(8),
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  subBtnOn: {
    borderColor: colors.border,
  },
  subBtnText: {
    color: fade(colors.textPrimary, 0.45),
    fontFamily: fonts.body,
    fontSize: 12,
  },
  chevOpen: {
    transform: [{ rotate: '90deg' }],
  },
  iconBtn: {
    width: 28,
    height: 28,
    ...rounded(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  subs: {
    paddingLeft: 42,
    paddingRight: 10,
    paddingBottom: 12,
    gap: 2,
  },
  sub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  subTitle: {
    flex: 1,
    minWidth: 0,
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  subAdd: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  subField: {
    flex: 1,
    minWidth: 0,
    minHeight: 36,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgInset,
    ...rounded(10),
    paddingHorizontal: 12,
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  subAddBtn: {
    minHeight: 36,
    paddingHorizontal: 14,
    ...rounded(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  subAddText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
  },
  empty: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
    paddingVertical: 26,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    ...rounded(12),
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  hint: {
    color: fade(colors.textPrimary, 0.4),
    fontFamily: fonts.body,
    fontSize: 12,
    textAlign: 'center',
  },
});
