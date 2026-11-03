import { colors } from '@/src/theme/tokens';
import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useLumiFi } from '@/components/lumifi/logic';
import { panelStyles as styles } from '@/components/lumifi/shared/panel-styles';
import { useTone } from '@/components/lumifi/features/tone';

export function TaskPanel({ mobile = false }: { mobile?: boolean }) {
  const { tasks, activeTask, addTask, toggleTask, focusTask } = useLumiFi();
  const tone = useTone(mobile);
  const [draft, setDraft] = useState('');
  const open = tasks.filter((task) => !task.done).length;

  return (
    <View>
      <View style={styles.addRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="What are you studying?"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.bgCard }]}
          onSubmitEditing={() => {
            addTask(draft);
            setDraft('');
          }}
        />
        <Pressable
          style={[styles.solidBtn, { backgroundColor: tone.solid }]}
          onPress={() => {
            addTask(draft);
            setDraft('');
          }}
        >
          <Text style={[styles.solidBtnText, { color: tone.ink }]}>Add</Text>
        </Pressable>
      </View>
      {tasks.length === 0 ? <Text style={styles.empty}>No tasks yet. Add what you plan to study.</Text> : null}
      {tasks.map((task) => {
        const active = activeTask?.id === task.id;
        return (
          <View
            key={task.id}
            style={[
              styles.task,
              mobile && styles.taskMobile,
              { borderColor: active ? tone.accent : colors.border, backgroundColor: colors.bgCard },
            ]}
          >
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: task.done }} accessibilityLabel={`Mark ${task.text} ${task.done ? 'incomplete' : 'complete'}`} onPress={() => toggleTask(task.id)} style={[styles.check, { borderColor: task.done ? tone.accent : colors.border, backgroundColor: task.done ? tone.accent : 'transparent' }]} />
            <View style={styles.taskCopy}>
              <Text style={[styles.taskText, task.done && styles.done]}>{task.text}</Text>
              <Text style={styles.meta}>{task.pomos} {task.pomos === 1 ? 'session' : 'sessions'}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={active ? `${task.text} is active` : `Focus on ${task.text}`}
              onPress={() => focusTask(task.id)}
              style={[styles.mini, active && { backgroundColor: tone.solid, borderColor: tone.solid }]}
            >
              <Text style={[styles.miniText, active && { color: tone.ink }]}>{active ? 'Active' : 'Focus on'}</Text>
            </Pressable>
          </View>
        );
      })}
      <Text style={styles.note}>{open} open. Choose “Focus on” and your next sessions count toward that task.</Text>
    </View>
  );
}
