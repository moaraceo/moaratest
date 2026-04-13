import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../constants/theme";

export default function ExploreScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Explore Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 20,
    color: colors.text,
  },
});
