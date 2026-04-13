import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const INDUSTRY_OPTIONS: { code: IndustryCode; label: string; emoji: string }[] = [
  { code: "cafe",        label: "카페·음료",  emoji: "☕" },
  { code: "restaurant",  label: "음식점·식당", emoji: "🍽️" },
  { code: "bar",         label: "주점",       emoji: "🍺" },
  { code: "convenience", label: "편의점",     emoji: "🏪" },
  { code: "retail",      label: "소매·잡화",  emoji: "🛍️" },
  { code: "academy",     label: "학원",       emoji: "📚" },
  { code: "beauty",      label: "미용·뷰티",  emoji: "💇" },
  { code: "other",       label: "기타",       emoji: "📋" },
];

export default function WorkplaceSettingsScreen() {
  const { workplaceId } = useLocalSearchParams<{ workplaceId: string }>();
  const { workplaces, updateWorkplace, currentWorkplaceId } = useWorkplace();

  const targetId = workplaceId ?? currentWorkplaceId;
  const workplace = workplaces.find((w) => w.id === targetId);

  const [name, setName]       = useState(workplace?.name ?? "");
  const [address, setAddress] = useState(workplace?.address ?? "");
  const [industry, setIndustry] = useState<IndustryCode | null>(workplace?.industryCode ?? null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (workplace) {
      setName(workplace.name);
      setAddress(workplace.address);
      setIndustry(workplace.industryCode);
    }
  }, [workplace?.id]);

  if (!workplace) return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;

  const isDirty =
    name.trim() !== workplace.name ||
    address.trim() !== workplace.address ||
    industry !== workplace.industryCode;

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("오류", "사업장 이름을 입력해주세요.");
      return;
    }
    setIsSaving(true);
    updateWorkplace(targetId, {
      name: name.trim(),
      address: address.trim(),
      industryCode: industry,
    });
    await new Promise((r) => setTimeout(r, 300));
    setIsSaving(false);
    Alert.alert("저장 완료", "사업장 정보가 업데이트됐어요.", [
      { text: "확인", onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>사업장 설정</Text>
        <TouchableOpacity
          style={[styles.saveBtn, (!isDirty || isSaving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!isDirty || isSaving}
        >
          {isSaving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>저장</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── 기본 정보 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기본 정보</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>사업장 이름</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="예: OO카페 강남점"
              placeholderTextColor={colors.text3}
              autoCorrect={false}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>주소</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="예: 서울시 강남구 테헤란로 123"
              placeholderTextColor={colors.text3}
              autoCorrect={false}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>업종</Text>
            <View style={styles.industryGrid}>
              {INDUSTRY_OPTIONS.map(({ code, label, emoji }) => {
                const selected = industry === code;
                return (
                  <TouchableOpacity
                    key={code}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setIndustry(code)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chipEmoji}>{emoji}</Text>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── GPS 정보 ── */}
        {(workplace.gpsLat != null) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>위치 정보</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>위도</Text>
              <Text style={styles.infoValue}>{workplace.gpsLat?.toFixed(6)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>경도</Text>
              <Text style={styles.infoValue}>{workplace.gpsLng?.toFixed(6)}</Text>
            </View>
            {workplace.regionCode && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>지역 코드</Text>
                <Text style={styles.infoValue}>{workplace.regionCode}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── 빠른 이동 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>빠른 이동</Text>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push(`/owner-invite?workplaceId=${targetId}`)}
            activeOpacity={0.7}
          >
            <View style={[styles.linkIcon, { backgroundColor: "#EDE9FE" }]}>
              <Text style={styles.linkIconText}>🔗</Text>
            </View>
            <View style={styles.linkInfo}>
              <Text style={styles.linkTitle}>직원 초대 코드</Text>
              <Text style={styles.linkDesc}>코드 발급 및 공유</Text>
            </View>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push(`/owner-payroll-settings?workplaceId=${targetId}`)}
            activeOpacity={0.7}
          >
            <View style={[styles.linkIcon, { backgroundColor: colors.primaryDim }]}>
              <Text style={styles.linkIconText}>💰</Text>
            </View>
            <View style={styles.linkInfo}>
              <Text style={styles.linkTitle}>급여 계산 설정</Text>
              <Text style={styles.linkDesc}>시급·수당·계산 단위 설정</Text>
            </View>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── 사업장 메타 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>사업장 정보</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>사업장 ID</Text>
            <Text style={[styles.infoValue, styles.mono]}>{workplace.id}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>등록일</Text>
            <Text style={styles.infoValue}>{workplace.createdAt}</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  backArrow: { fontSize: 20, color: colors.primary, fontWeight: "600" },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 56,
    alignItems: "center",
    ...shadows.button,
  },
  saveBtnDisabled: { backgroundColor: colors.border, shadowOpacity: 0, elevation: 0 },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  scroll: { flex: 1 },

  section: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text2,
    letterSpacing: 0.4,
    marginBottom: 16,
  },

  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "500", color: colors.text2, marginBottom: 8 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },

  industryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryDim,
  },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: 13, fontWeight: "500", color: colors.text2 },
  chipTextSelected: { color: colors.primary, fontWeight: "700" },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg,
  },
  infoLabel: { fontSize: 14, color: colors.text2 },
  infoValue: { fontSize: 14, color: colors.text, fontWeight: "500" },
  mono: { fontFamily: "monospace", fontSize: 12, color: colors.text3 },

  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 14,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  linkIconText: { fontSize: 18 },
  linkInfo: { flex: 1 },
  linkTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  linkDesc: { fontSize: 12, color: colors.text2, marginTop: 2 },
  linkArrow: { fontSize: 22, color: colors.text3, fontWeight: "600" },
  rowDivider: { height: 1, backgroundColor: colors.bg, marginHorizontal: -4 },
});
