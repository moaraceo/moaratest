import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, shadows } from "../constants/theme";
import { useWorkplace } from "./store/workplaceStore";

export default function InviteCodeScreen() {
  const [inviteCode, setInviteCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const { joinByInviteCode, setCurrentWorkplace } = useWorkplace();

  const handleInputChange = (value: string, index: number) => {
    // Only allow alphanumeric characters
    if (value && !/^[A-Za-z0-9]$/.test(value)) return;

    const newCode = [...inviteCode];
    newCode[index] = value.toUpperCase();
    setInviteCode(newCode);
    setError("");

    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Move to previous input on backspace
    if (e.nativeEvent.key === "Backspace" && !inviteCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    const code = inviteCode.join("");
    if (code.length !== 6) {
      setError("6자리 모두 입력해주세요");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await joinByInviteCode(code);

      if (result.success && result.workplace) {
        setCurrentWorkplace(result.workplace.id);
        router.replace("/staff-main");
      } else {
        setError(result.error || "유효하지 않은 초대 코드예요");
      }
    } catch (err) {
      setError("초대 코드 확인 중 오류가 발생했어요");
      console.error("Invite code error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.content}>
          <Text style={styles.title}>초대 코드를 입력하세요</Text>
          <Text style={styles.subtitle}>
            사장님께 받은 6자리 초대 코드를 입력해주세요
          </Text>

          <View style={styles.inputContainer}>
            {inviteCode.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[styles.codeInput, error ? styles.codeInputError : null]}
                value={digit}
                onChangeText={(value) => handleInputChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="default"
                autoCapitalize="characters"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
                editable={!isLoading}
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, isLoading ? styles.buttonDisabled : null]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>확인</Text>
            )}
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
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text2,
    textAlign: "center",
    marginBottom: 60,
  },
  inputContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
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
  codeInputError: {
    borderColor: "#FF4444",
  },
  errorText: {
    color: "#FF4444",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    ...shadows.button,
  },
  buttonDisabled: {
    backgroundColor: colors.border,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
