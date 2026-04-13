import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, shadows } from "../constants/theme";
import { useWorkplace } from "./store/workplaceStore";

function formatExpiry(isoString: string): string {
  const expiry = new Date(isoString);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  if (diffMs <= 0) return "만료됨";
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (diffH >= 1) return `${diffH}시간 ${diffM}분 후 만료`;
  return `${diffM}분 후 만료`;
}

export default function OwnerInviteScreen() {
  const { workplaceId } = useLocalSearchParams<{ workplaceId: string }>();
  const { workplaces, generateInviteCode } = useWorkplace();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [expiryText, setExpiryText] = useState("");

  const workplace = workplaces.find((w) => w.id === workplaceId) ?? workplaces[0];

  useEffect(() => {
    if (!workplace) return;
    setExpiryText(formatExpiry(workplace.inviteCodeExpiry));
    const interval = setInterval(() => {
      setExpiryText(formatExpiry(workplace.inviteCodeExpiry));
    }, 60000);
    return () => clearInterval(interval);
  }, [workplace?.inviteCodeExpiry]);

  if (!workplace) return <ActivityIndicator style={{ flex: 1 }} />;

  const handleRegenerate = () => {
    setIsRegenerating(true);
    generateInviteCode(workplace.id);
    setTimeout(() => setIsRegenerating(false), 300);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `[모아라] ${workplace.name} 초대 코드: ${workplace.inviteCode}\n앱에서 '사업장 참여하기'를 선택하고 코드를 입력해주세요.\n(24시간 유효)`,
      });
    } catch {
      // 취소 시 무시
    }
  };

  // 코드를 6글자 배열로 나눠 표시
  const codeChars = workplace.inviteCode.split("");

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>직원 초대</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* 사업장 이름 */}
        <Text style={styles.workplaceName}>{workplace.name}</Text>
        <Text style={styles.subtitle}>
          아래 코드를 직원에게 공유하세요.{"\n"}직원이 앱에서 입력하면 자동으로 참여돼요.
        </Text>

        {/* 코드 카드 */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>초대 코드</Text>
          <View style={styles.codeRow}>
            {codeChars.map((char, i) => (
              <View key={i} style={styles.codeBox}>
                <Text style={styles.codeChar}>{char}</Text>
              </View>
            ))}
          </View>
          <View style={styles.expiryRow}>
            <View style={[styles.expiryDot, expiryText === "만료됨" && styles.expiryDotRed]} />
            <Text style={[styles.expiryText, expiryText === "만료됨" && styles.expiryTextRed]}>
              {expiryText}
            </Text>
          </View>
        </View>

        {/* 버튼 영역 */}
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
          <Text style={styles.shareBtnText}>코드 공유하기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.regenBtn, isRegenerating && { opacity: 0.6 }]}
          onPress={handleRegenerate}
          disabled={isRegenerating}
          activeOpacity={0.7}
        >
          {isRegenerating ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={styles.regenBtnText}>코드 재발급 (24시간 연장)</Text>
          )}
        </TouchableOpacity>

        {/* 안내 */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            • 코드는 발급 시점부터 24시간 유효해요{"\n"}
            • 재발급하면 이전 코드는 즉시 무효화돼요{"\n"}
            • 한 번 참여한 직원은 재입력 없이 계속 사용할 수 있어요
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  backArrow: { fontSize: 20, color: colors.primary, fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "600", color: colors.text },

  content: { flex: 1, paddingHorizontal: 24, paddingTop: 32 },

  workplaceName: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.text2, lineHeight: 20, marginBottom: 32 },

  codeCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  codeLabel: { fontSize: 13, color: colors.text2, marginBottom: 16, fontWeight: "500" },
  codeRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  codeBox: {
    width: 44,
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.primaryDim,
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  codeChar: { fontSize: 22, fontWeight: "700", color: colors.primary },

  expiryRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  expiryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  expiryDotRed: { backgroundColor: colors.danger },
  expiryText: { fontSize: 13, color: colors.text2 },
  expiryTextRed: { color: colors.danger },

  shareBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    ...shadows.button,
  },
  shareBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  regenBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
  },
  regenBtnText: { fontSize: 15, fontWeight: "600", color: colors.primary },

  noticeBox: {
    backgroundColor: colors.surface2,
    borderRadius: 12,
    padding: 16,
  },
  noticeText: { fontSize: 13, color: colors.text2, lineHeight: 22 },
});
