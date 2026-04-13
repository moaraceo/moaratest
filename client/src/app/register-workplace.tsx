import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, shadows } from "../constants/theme";
import { IndustryCode, useWorkplace } from "./store/workplaceStore";

// ─────────────────────────────────────────────
// 업종 목록
// ─────────────────────────────────────────────

const INDUSTRY_OPTIONS: { code: IndustryCode; label: string }[] = [
  { code: "cafe",         label: "카페·음료" },
  { code: "restaurant",   label: "음식점·식당" },
  { code: "bar",          label: "주점" },
  { code: "convenience",  label: "편의점" },
  { code: "retail",       label: "소매·잡화" },
  { code: "academy",      label: "학원" },
  { code: "beauty",       label: "미용·뷰티" },
  { code: "other",        label: "기타" },
];

// ─────────────────────────────────────────────
// 화면
// ─────────────────────────────────────────────

export default function RegisterWorkplaceScreen() {
  const { addWorkplace, setCurrentWorkplace } = useWorkplace();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryCode | null>(null);
  const [nameError, setNameError] = useState("");
  const [industryError, setIndustryError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    let valid = true;
    if (!name.trim()) {
      setNameError("사업장 이름을 입력해주세요");
      valid = false;
    } else {
      setNameError("");
    }
    if (!selectedIndustry) {
      setIndustryError("업종을 선택해주세요");
      valid = false;
    } else {
      setIndustryError("");
    }
    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    let gpsLat: number | undefined;
    let gpsLng: number | undefined;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        gpsLat = loc.coords.latitude;
        gpsLng = loc.coords.longitude;
      }
    } catch {
      // GPS 실패 시 null로 등록 (역지오코딩은 서버에서 처리)
    }

    // TODO: ownerId를 실제 로그인 사용자 ID로 교체
    const newWP = addWorkplace(
      name.trim(),
      address.trim(),
      "owner-1",
      selectedIndustry!,
      gpsLat,
      gpsLng,
    );
    setCurrentWorkplace(newWP.id);

    setIsSubmitting(false);
    router.replace("/owner-dashboard");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 헤더 */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>사업장 등록</Text>
            <Text style={styles.subtitle}>
              업종 정보는 서비스 개선에 활용돼요
            </Text>
          </View>

          {/* 사업장 이름 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>사업장 이름</Text>
            <TextInput
              style={[styles.input, nameError ? styles.inputError : null]}
              placeholder="예: OO카페 강남점"
              placeholderTextColor={colors.text3}
              value={name}
              onChangeText={(v) => { setName(v); setNameError(""); }}
              autoCorrect={false}
            />
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
          </View>

          {/* 주소 (선택) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>주소 (선택)</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 서울시 강남구 테헤란로 123"
              placeholderTextColor={colors.text3}
              value={address}
              onChangeText={setAddress}
              autoCorrect={false}
            />
          </View>

          {/* 업종 선택 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>업종</Text>
            <View style={styles.industryGrid}>
              {INDUSTRY_OPTIONS.map(({ code, label }) => {
                const selected = selectedIndustry === code;
                return (
                  <TouchableOpacity
                    key={code}
                    style={[styles.industryChip, selected && styles.industryChipSelected]}
                    onPress={() => { setSelectedIndustry(code); setIndustryError(""); }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.industryChipText,
                        selected && styles.industryChipTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {industryError ? <Text style={styles.errorText}>{industryError}</Text> : null}
          </View>

          {/* GPS 안내 */}
          <View style={styles.gpsNotice}>
            <Text style={styles.gpsNoticeText}>
              위치 권한을 허용하면 매장 GPS 좌표가 자동으로 저장돼요.
              지역별 분석에 활용됩니다.
            </Text>
          </View>

          {/* 등록 버튼 */}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>사업장 등록</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },

  headerSection: { marginBottom: 36 },
  title: { fontSize: 26, fontWeight: "700", color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.text2, lineHeight: 20 },

  fieldGroup: { marginBottom: 28 },
  label: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 10 },

  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
    ...shadows.card,
  },
  inputError: { borderColor: colors.danger },
  errorText: { fontSize: 12, color: colors.danger, marginTop: 6 },

  // 업종 칩 그리드 (4열)
  industryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  industryChip: {
    width: "47%",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    ...shadows.card,
  },
  industryChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryDim,
  },
  industryChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text2,
  },
  industryChipTextSelected: {
    color: colors.primary,
    fontWeight: "700",
  },

  gpsNotice: {
    backgroundColor: colors.surface2,
    borderRadius: 10,
    padding: 14,
    marginBottom: 28,
  },
  gpsNoticeText: {
    fontSize: 13,
    color: colors.text2,
    lineHeight: 18,
  },

  submitBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.button,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 17, fontWeight: "700", color: "#fff" },
});
