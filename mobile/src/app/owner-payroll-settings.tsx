import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, shadows } from "../constants/theme";
import { CURRENT_MINIMUM_WAGE } from "./constants/minimumWage";
import { usePayrollSettings } from "./store/payrollSettingsStore";
import { PayrollUnit, WorkplacePayrollSettings } from "./utils/payroll";

const PAYROLL_UNIT_OPTIONS: { label: string; value: PayrollUnit; desc: string }[] = [
  { label: "1분 단위", value: "minute", desc: "근무 분 그대로 계산" },
  { label: "10분 단위", value: "10min", desc: "10분 미만 절사" },
  { label: "30분 단위", value: "30min", desc: "30분 미만 절사" },
];

export default function OwnerPayrollSettingsScreen() {
  const { workplaceId = "workplace-1" } = useLocalSearchParams<{
    workplaceId: string;
  }>();
  const { getSettings, saveSettings, resetSettings } = usePayrollSettings();

  const [settings, setSettings] = useState<WorkplacePayrollSettings>(
    getSettings(workplaceId),
  );
  const [hourlyRateText, setHourlyRateText] = useState(
    String(settings.hourlyRate),
  );
  const [isSaving, setIsSaving] = useState(false);

  // workplaceId가 바뀌면 설정 새로고침
  useEffect(() => {
    const s = getSettings(workplaceId);
    setSettings(s);
    setHourlyRateText(String(s.hourlyRate));
  }, [workplaceId]);

  const update = <K extends keyof WorkplacePayrollSettings>(
    key: K,
    value: WorkplacePayrollSettings[K],
  ) => setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    const rate = Number(hourlyRateText.replace(/,/g, ""));
    if (isNaN(rate) || rate < CURRENT_MINIMUM_WAGE) {
      Alert.alert(
        "시급 오류",
        `시급은 최저시급(${CURRENT_MINIMUM_WAGE.toLocaleString()}원) 이상이어야 해요.`,
      );
      return;
    }
    setIsSaving(true);
    await saveSettings(workplaceId, { ...settings, hourlyRate: rate });
    setIsSaving(false);
    Alert.alert("저장 완료", "급여 설정이 저장됐어요.", [
      { text: "확인", onPress: () => router.back() },
    ]);
  };

  const handleReset = () => {
    Alert.alert("초기화", "기본값으로 되돌릴까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "초기화",
        style: "destructive",
        onPress: async () => {
          await resetSettings(workplaceId);
          const s = getSettings(workplaceId);
          setSettings(s);
          setHourlyRateText(String(s.hourlyRate));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>급여 계산 설정</Text>
        <TouchableOpacity onPress={handleReset}>
          <Text style={styles.resetText}>초기화</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── 사업장 규모 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>사업장 규모</Text>
          <Text style={styles.sectionDesc}>
            5인 미만 사업장은 연장·야간수당이 법적 의무가 아니에요.
            근로자의 날(5/1)에 1.5배 가산수당이 자동 적용돼요.
          </Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.radioRow}
              onPress={() => update("isUnder5Employees", true)}
            >
              <View style={[styles.radio, settings.isUnder5Employees && styles.radioActive]}>
                {settings.isUnder5Employees && <View style={styles.radioDot} />}
              </View>
              <View style={styles.radioTextGroup}>
                <Text style={styles.radioLabel}>5인 미만 사업장</Text>
                <Text style={styles.radioDesc}>연장·야간수당 비의무 / 근로자의 날 1.5배</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity
              style={styles.radioRow}
              onPress={() => update("isUnder5Employees", false)}
            >
              <View style={[styles.radio, !settings.isUnder5Employees && styles.radioActive]}>
                {!settings.isUnder5Employees && <View style={styles.radioDot} />}
              </View>
              <View style={styles.radioTextGroup}>
                <Text style={styles.radioLabel}>5인 이상 사업장</Text>
                <Text style={styles.radioDesc}>연장·야간·주휴수당 모두 법적 의무</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 기본 시급 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기본 시급</Text>
          <Text style={styles.sectionDesc}>
            최저시급({CURRENT_MINIMUM_WAGE.toLocaleString()}원) 이상이어야 해요.
          </Text>
          <View style={styles.card}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.wageInput}
                value={hourlyRateText}
                onChangeText={setHourlyRateText}
                keyboardType="numeric"
                placeholder={CURRENT_MINIMUM_WAGE.toLocaleString()}
                placeholderTextColor={colors.text3}
              />
              <Text style={styles.wageUnit}>원/시간</Text>
            </View>
            {Number(hourlyRateText.replace(/,/g, "")) < CURRENT_MINIMUM_WAGE && (
              <Text style={styles.wageWarning}>
                최저시급({CURRENT_MINIMUM_WAGE.toLocaleString()}원) 미달이에요
              </Text>
            )}
          </View>
        </View>

        {/* ── 계산 단위 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>급여 계산 단위</Text>
          <Text style={styles.sectionDesc}>
            설정 단위 미만 시간은 Math.floor로 절사돼요.
          </Text>
          <View style={styles.card}>
            {PAYROLL_UNIT_OPTIONS.map((opt, idx) => (
              <React.Fragment key={opt.value}>
                {idx > 0 && <View style={styles.rowDivider} />}
                <TouchableOpacity
                  style={styles.radioRow}
                  onPress={() => update("payrollUnit", opt.value)}
                >
                  <View
                    style={[
                      styles.radio,
                      settings.payrollUnit === opt.value && styles.radioActive,
                    ]}
                  >
                    {settings.payrollUnit === opt.value && (
                      <View style={styles.radioDot} />
                    )}
                  </View>
                  <View style={styles.radioTextGroup}>
                    <Text style={styles.radioLabel}>{opt.label}</Text>
                    <Text style={styles.radioDesc}>{opt.desc}</Text>
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* ── 수당 설정 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>수당 설정</Text>
          {settings.isUnder5Employees && (
            <Text style={styles.sectionDesc}>
              5인 미만은 연장·야간수당이 법적 의무가 아니지만 지급할 수 있어요.
            </Text>
          )}
          <View style={styles.card}>
            {/* 주휴수당 */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextGroup}>
                <Text style={styles.toggleLabel}>주휴수당</Text>
                <Text style={styles.toggleDesc}>
                  주 15시간 이상 근무 시 1일치 시급 지급 (전 사업장 의무)
                </Text>
              </View>
              <Switch
                value={settings.weeklyHolidayPay}
                onValueChange={(v) => update("weeklyHolidayPay", v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.rowDivider} />

            {/* 연장근로수당 */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextGroup}>
                <Text style={styles.toggleLabel}>
                  연장근로수당
                  {settings.isUnder5Employees && (
                    <Text style={styles.optionalBadge}> 선택</Text>
                  )}
                </Text>
                <Text style={styles.toggleDesc}>
                  일 8시간 초과분 × 0.5배 추가
                  {!settings.isUnder5Employees ? " (5인 이상 의무)" : ""}
                </Text>
              </View>
              <Switch
                value={settings.overtimePay}
                onValueChange={(v) => update("overtimePay", v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.rowDivider} />

            {/* 야간근로수당 */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextGroup}>
                <Text style={styles.toggleLabel}>
                  야간근로수당
                  {settings.isUnder5Employees && (
                    <Text style={styles.optionalBadge}> 선택</Text>
                  )}
                </Text>
                <Text style={styles.toggleDesc}>
                  22:00~06:00 구간 × 0.5배 추가
                  {!settings.isUnder5Employees ? " (5인 이상 의무)" : ""}
                </Text>
              </View>
              <Switch
                value={settings.nightPay}
                onValueChange={(v) => update("nightPay", v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* ── 근로자의 날 안내 ── */}
        {settings.isUnder5Employees && (
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>근로자의 날 (5월 1일)</Text>
            <Text style={styles.infoBoxText}>
              5인 미만 사업장에서 5월 1일 근무 시{"\n"}
              기본급의 1.5배(가산수당 0.5배)가 자동 적용돼요.
            </Text>
          </View>
        )}

        {/* ── 저장 버튼 ── */}
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveBtnText}>
            {isSaving ? "저장 중…" : "설정 저장"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
    justifyContent: "center", alignItems: "center",
  },
  backArrow: { fontSize: 18, fontWeight: "600", color: colors.text },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  resetText: { fontSize: 13, color: colors.text2 },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 12, color: colors.text2, lineHeight: 18, marginBottom: 10,
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 16, overflow: "hidden",
    ...shadows.card,
  },

  radioRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.border,
    justifyContent: "center", alignItems: "center",
    marginRight: 12,
  },
  radioActive: { borderColor: colors.primary },
  radioDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioTextGroup: { flex: 1 },
  radioLabel: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 2 },
  radioDesc: { fontSize: 12, color: colors.text2 },

  rowDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },

  inputRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 4,
  },
  wageInput: {
    flex: 1, fontSize: 20, fontWeight: "700", color: colors.text,
    paddingVertical: 10,
  },
  wageUnit: { fontSize: 14, color: colors.text2, marginLeft: 6 },
  wageWarning: { fontSize: 12, color: colors.danger, paddingHorizontal: 16, paddingBottom: 10 },

  toggleRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  toggleTextGroup: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 2 },
  toggleDesc: { fontSize: 12, color: colors.text2, lineHeight: 16 },
  optionalBadge: { fontSize: 11, color: colors.text3 },

  infoBox: {
    backgroundColor: colors.primaryDim,
    borderWidth: 1, borderColor: colors.primary,
    borderRadius: 14, padding: 14, marginBottom: 24,
  },
  infoBoxTitle: {
    fontSize: 13, fontWeight: "700", color: colors.primary, marginBottom: 4,
  },
  infoBoxText: { fontSize: 12, color: colors.text2, lineHeight: 18 },

  saveBtn: {
    height: 54, borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: "center", alignItems: "center",
    ...shadows.button,
  },
  saveBtnDisabled: { backgroundColor: colors.border, shadowOpacity: 0, elevation: 0 },
  saveBtnText: { fontSize: 17, fontWeight: "700", color: "#fff" },
});
