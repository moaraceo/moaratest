import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { colors } from "../../../constants/theme";

export default function LoadingSpinner() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    alignItems: "center",
  },
});
