import React, { createContext, ReactNode, useContext, useState } from "react";

// 메시지 타입 정의
export type Message = {
  id: string;
  senderId: string;       // 보낸 사람 ID
  senderName: string;     // 보낸 사람 이름
  senderRole: 'owner' | 'staff';  // 역할
  receiverId: string;     // 받는 사람 ID
  content: string;        // 메시지 내용
  type: 'text' | 'request' | 'confirm' | 'notice';
  // text: 일반 메시지
  // request: 수정 요청 자동 메시지
  // confirm: 승인/반려 자동 메시지
  // notice: 급여 확정 알림
  createdAt: string;      // 발송 시각
  isRead: boolean;        // 읽음 여부
};

export type Conversation = {
  id: string;
  staffId: string;
  staffName: string;
  staffInitial: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: Message[];
};

// Context 타입
interface MessageContextType {
  conversations: Conversation[];
  sendMessage: (staffId: string, content: string, type: Message['type'], senderRole?: 'owner' | 'staff') => void;
  markAsRead: (conversationId: string) => void;
  getUnreadCount: () => number;
  getTotalUnread: () => number;
}

// Context 생성
const MessageContext = createContext<MessageContextType | undefined>(
  undefined,
);

// Provider 컴포넌트
export function MessageProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: "1",
      staffId: "1",
      staffName: "김민지",
      staffInitial: "김",
      lastMessage: "감사합니다!",
      lastMessageAt: "2025-03-14T15:30:00",
      unreadCount: 0,
      messages: [
        {
          id: "m1",
          senderId: "system",
          senderName: "MOARA",
          senderRole: "owner",
          receiverId: "1",
          content: "출퇴근 수정 요청이 도착했어요. 퇴근 18:05 → 20:00",
          type: "request",
          createdAt: "2025-03-14T14:20:00",
          isRead: true,
        },
        {
          id: "m2",
          senderId: "owner",
          senderName: "사장님",
          senderRole: "owner",
          receiverId: "1",
          content: "확인했어요. 승인할게요",
          type: "text",
          createdAt: "2025-03-14T15:15:00",
          isRead: true,
        },
        {
          id: "m3",
          senderId: "1",
          senderName: "김민지",
          senderRole: "staff",
          receiverId: "owner",
          content: "감사합니다!",
          type: "text",
          createdAt: "2025-03-14T15:30:00",
          isRead: true,
        },
      ],
    },
    {
      id: "2",
      staffId: "2",
      staffName: "박준혁",
      staffInitial: "박",
      lastMessage: "주휴수당 계산 기준이 궁금해요",
      lastMessageAt: "2025-03-14T16:45:00",
      unreadCount: 1,
      messages: [
        {
          id: "m4",
          senderId: "system",
          senderName: "MOARA",
          senderRole: "owner",
          receiverId: "2",
          content: "이번달 급여가 확정됐어요. 783,000원",
          type: "notice",
          createdAt: "2025-03-14T16:00:00",
          isRead: true,
        },
        {
          id: "m5",
          senderId: "2",
          senderName: "박준혁",
          senderRole: "staff",
          receiverId: "owner",
          content: "주휴수당 계산 기준이 궁금해요",
          type: "text",
          createdAt: "2025-03-14T16:45:00",
          isRead: false,
        },
      ],
    },
  ]);

  // 메시지 발송
  const sendMessage = (staffId: string, content: string, type: Message['type'], senderRole: 'owner' | 'staff' = 'owner') => {
    const newMessage: Message = {
      id: `m${Date.now()}`,
      senderId: senderRole === 'owner' ? 'owner' : staffId,
      senderName: senderRole === 'owner' ? '사장님' : conversations.find(c => c.staffId === staffId)?.staffName || '',
      senderRole,
      receiverId: senderRole === 'owner' ? staffId : 'owner',
      content,
      type,
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    setConversations(prev => {
      const updated = prev.map(conv => {
        if (conv.staffId === staffId) {
          return {
            ...conv,
            lastMessage: content,
            lastMessageAt: newMessage.createdAt,
            unreadCount: senderRole === 'staff' ? conv.unreadCount + 1 : conv.unreadCount,
            messages: [...conv.messages, newMessage],
          };
        }
        return conv;
      });

      // If conversation doesn't exist, create new one
      const existingConv = prev.find(c => c.staffId === staffId);
      if (!existingConv) {
        const staffConv = conversations.find(c => c.staffId === staffId);
        if (staffConv) {
          return [...updated, {
            id: `conv${Date.now()}`,
            staffId,
            staffName: staffConv.staffName,
            staffInitial: staffConv.staffInitial,
            lastMessage: content,
            lastMessageAt: newMessage.createdAt,
            unreadCount: senderRole === 'staff' ? 1 : 0,
            messages: [newMessage],
          }];
        }
      }

      return updated;
    });
  };

  // 읽음 처리
  const markAsRead = (conversationId: string) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, unreadCount: 0, messages: conv.messages.map(msg => ({ ...msg, isRead: true })) }
          : conv
      )
    );
  };

  // 미읽음 수
  const getUnreadCount = () => {
    return conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
  };

  // 탭바 뱃지용 숫자
  const getTotalUnread = () => {
    return getUnreadCount();
  };

  return (
    <MessageContext.Provider
      value={{
        conversations,
        sendMessage,
        markAsRead,
        getUnreadCount,
        getTotalUnread,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
}

// Hook
export function useMessage() {
  const context = useContext(MessageContext);
  if (context === undefined) {
    throw new Error('useMessage must be used within a MessageProvider');
  }
  return context;
}
