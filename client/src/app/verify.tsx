import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { colors, shadows } from "../constants/theme";

export default function VerifyScreen() {
  const [verificationCode, setVerificationCode] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleInputChange = (value: string, index: number) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Move to previous input on backspace
    if (
      e.nativeEvent.key === "Backspace" &&
      !verificationCode[index] &&
      index > 0
    ) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const code = verificationCode.join("");
    if (code.length === 6) {
      // TODO: Implement verification logic
      console.log("인증번호 확인:", code);
      // Navigate to role selection screen
      router.push("/role-select");
    } else {
      console.log("6자리 모두 입력해주세요");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.content}>
          <Text style={styles.title}>인증번호를 입력하세요</Text>

          <View style={styles.inputContainer}>
            {verificationCode.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={styles.codeInput}
                value={digit}
                onChangeText={(value) => handleInputChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="numeric"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
              />
            ))}
          </View>

          <TouchableOpacity style={styles.button} onPress={handleVerify}>
            <Text style={styles.buttonText}>확인</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
    marginBottom: 60,
  },
  inputContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  codeInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    width: 50,
    height: 60,
    fontSize: 24,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    ...shadows.button,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
