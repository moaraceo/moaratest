import { router } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { borderRadius, colors, shadows, spacing } from "../../constants/theme";

export default function HomeScreen() {
  const [phoneNumber, setPhoneNumber] = useState("");

  const handleGetVerificationCode = () => {
    // TODO: Implement verification code logic
    console.log("인증번호 받기:", phoneNumber);
    // Navigate to verification screen
    router.push("/verify");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.content}>
          <Image
            source={require("../../../assets/images/react-logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>소상공인 근태·급여 관리 서비스</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.phoneInput}
              placeholder="휴대폰 번호를 입력하세요"
              placeholderTextColor="#8B92A3"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              maxLength={11}
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleGetVerificationCode}
          >
            <Text style={styles.buttonText}>인증번호 받기</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              소상공인 근태·급여 관리 서비스
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  logoImage: {
    width: 220,
    height: 90,
    resizeMode: "contain",
    alignSelf: "center",
    marginBottom: spacing.sm,
    marginTop: spacing.xxl,
  },
  logoText: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  inputContainer: {
    width: "100%",
    marginBottom: spacing.lg,
  },
  phoneInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    ...shadows.card,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    ...shadows.button,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  footerText: {
    fontSize: 14,
    color: colors.text2,
    textAlign: "center",
  },
});
