import { WickglowScreen } from '@/components/wickglow/wickglow-screen';
import { colors } from '@/src/theme/tokens';
import { StyleSheet, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.fill}>
      <WickglowScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
});
