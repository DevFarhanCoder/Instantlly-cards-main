import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

type PlaceholderScreenProps = {
  title: string;
  subtitle?: string;
};

const PlaceholderScreen = ({ title, subtitle }: PlaceholderScreenProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>
        {subtitle || "Screen will be ported to React Native next."}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.foreground,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: "center",
  },
});

export default PlaceholderScreen;
