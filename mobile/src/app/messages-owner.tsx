import { router } from "expo-router";
import React from "react";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import EmptyState from "./components/common/EmptyState";
import { useMessage } from "./store/messageStore";

export default function MessagesOwnerScreen() {
  const { conversations, getTotalUnread, markAsRead } = useMessage();

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString("ko-KR", { weekday: "short" });
    } else {
      return date.toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const handleConversationPress = (conversation: any) => {
    markAsRead(conversation.id);
    router.push({
      pathname: "/chat" as any,
      params: {
        staffId: conversation.staffId,
        staffName: conversation.staffName,
      },
    });
  };

  const getAvatarColor = (status: string) => {
    switch (status) {
      case "active":
        return "#34C97A";
      case "probation":
        return "#FFB547";
      case "resigned":
        return "#FF5C5C";
      default:
        return "#4A9EFF";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>메시지</Text>
        <View style={styles.headerRight}>
          {getTotalUnread() > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{getTotalUnread()}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* System Notifications Section */}
        <View style={styles.systemSection}>
          <Text style={styles.systemHeader}>MOARA 알림</Text>
          <View style={styles.systemItem}>
            <View style={styles.systemIcon}>
              <Text style={styles.systemIconText}>📋</Text>
            </View>
            <View style={styles.systemContent}>
              <Text style={styles.systemTitle}>미승인 근태 2건</Text>
              <Text style={styles.systemMessage}>급여 확정 전 처리 필요</Text>
            </View>
            <Text style={styles.systemTime}>방금</Text>
          </View>
        </View>

        {/* Conversations List */}
        <View style={styles.conversationsSection}>
          <Text style={styles.sectionTitle}>대화</Text>

          {conversations.length === 0 ? (
            <EmptyState
              icon="💬"
              title="메시지가 없어요"
              subtitle="직원과 대화를 시작해보세요"
            />
          ) : (
            conversations.map((conversation, index) => (
              <View key={conversation.id}>
                <TouchableOpacity
                  style={styles.conversationItem}
                  onPress={() => handleConversationPress(conversation)}
                >
                  <View style={styles.conversationLeft}>
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: getAvatarColor("active") },
                      ]}
                    >
                      <Text style={styles.avatarText}>
                        {conversation.staffInitial}
                      </Text>
                    </View>
                    <View style={styles.conversationContent}>
                      <Text style={styles.conversationName}>
                        {conversation.staffName}
                      </Text>
                      <Text style={styles.lastMessage} numberOfLines={1}>
                        {conversation.lastMessage}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.conversationRight}>
                    <Text style={styles.messageTime}>
                      {formatTime(conversation.lastMessageAt)}
                    </Text>
                    {conversation.unreadCount > 0 && (
                      <View style={styles.unreadDot}>
                        <Text style={styles.unreadDotText}>
                          {conversation.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
                {index < conversations.length - 1 && (
                  <View style={styles.divider} />
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/owner-dashboard")}
        >
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={styles.tabText}>홈</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/approval")}
        >
          <Text style={styles.tabIcon}>✅</Text>
          <Text style={styles.tabText}>근태승인</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/payroll")}
        >
          <Text style={styles.tabIcon}>💰</Text>
          <Text style={styles.tabText}>급여정산</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/labor-report")}
        >
          <Text style={styles.tabIcon}>📊</Text>
          <Text style={styles.tabText}>리포트</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/staff-manage")}
        >
          <Text style={styles.tabIcon}>👥</Text>
          <Text style={styles.tabText}>직원관리</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F1117",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1A1D27",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  headerRight: {
    width: 40,
    alignItems: "flex-end",
  },
  unreadBadge: {
    backgroundColor: "#FF5C5C",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: "center",
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  systemSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  systemHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  systemItem: {
    backgroundColor: "#1A3A6A",
    borderWidth: 1,
    borderColor: "#4A9EFF",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  systemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4A9EFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  systemIconText: {
    fontSize: 18,
  },
  systemContent: {
    flex: 1,
  },
  systemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  systemMessage: {
    fontSize: 12,
    color: "#8B92AA",
  },
  systemTime: {
    fontSize: 11,
    color: "#8B92AA",
  },
  conversationsSection: {
    marginBottom: 100, // Space for tab bar
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  conversationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  conversationLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  conversationContent: {
    flex: 1,
  },
  conversationName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 12,
    color: "#8B92AA",
  },
  conversationRight: {
    alignItems: "flex-end",
  },
  messageTime: {
    fontSize: 11,
    color: "#8B92AA",
    marginBottom: 4,
  },
  unreadDot: {
    backgroundColor: "#FF5C5C",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadDotText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  divider: {
    height: 1,
    backgroundColor: "#2E3347",
    marginVertical: 8,
  },
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1A1D27",
    borderTopWidth: 1,
    borderTopColor: "#2E3347",
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 10,
    color: "#555D75",
    fontWeight: "500",
  },
});
