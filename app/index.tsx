import { LumiFiScreen } from '@/components/lumifi/lumifi-screen';
import { colors } from '@/src/theme/tokens';
import { StyleSheet, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.fill}>
      <LumiFiScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
});
