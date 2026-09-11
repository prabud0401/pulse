import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { apiClient } from '../../src/api/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolInvocation?: { toolName: string; durationMs: number };
  timestamp: string;
}

const PROMPT_SHORTCUTS = [
  '📊 Audit my finances and net worth',
  '📝 Today\'s standup and overdue tasks',
  '⚡ Probe MCP server health',
  '💡 How can I reduce SaaS expenses?',
];

export default function AssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-1',
      role: 'assistant',
      content: 'Welcome to Pulse Intelligence. I have direct access to your local bank accounts, tasks, and connected Railway MCP tools.',
      timestamp: 'Just now',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await apiClient.post<any>('/ai/chat', { message: query });
      const replyContent = res?.message?.content || res?.reply || "I've processed your request with the active MCP tools.";
      const toolCall = res?.message?.toolInvocation;

      const assistantMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: replyContent,
        toolInvocation: toolCall,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      // Fallback response handled in client.ts
    } finally {
      setLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenContainer>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Pulse Intelligence</Text>
            <Text style={styles.subtitle}>Gemini 1.5 • 32 Live MCP Tools</Text>
          </View>
          <View style={styles.badgeLive}>
            <Text style={styles.badgeLiveText}>ONLINE</Text>
          </View>
        </View>

        {/* Shortcut Chips */}
        <View style={styles.shortcutsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shortcutsScroll}>
            {PROMPT_SHORTCUTS.map((s, idx) => (
              <TouchableOpacity key={idx} style={styles.chip} onPress={() => handleSend(s)}>
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Chat Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatArea}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(msg => {
            const isUser = msg.role === 'user';
            return (
              <View key={msg.id} style={[styles.msgWrapper, isUser ? styles.msgRight : styles.msgLeft]}>
                {/* Tool Badge */}
                {msg.toolInvocation && (
                  <View style={styles.toolBadge}>
                    <Text style={styles.toolBadgeText}>
                      ⚡ Called {msg.toolInvocation.toolName} ({msg.toolInvocation.durationMs}ms)
                    </Text>
                  </View>
                )}

                <View style={[styles.msgBubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
                  <Text style={[styles.msgText, isUser ? styles.msgTextUser : styles.msgTextAI]}>
                    {msg.content}
                  </Text>
                  <Text style={styles.msgTime}>{msg.timestamp}</Text>
                </View>
              </View>
            );
          })}

          {loading && (
            <View style={[styles.msgWrapper, styles.msgLeft]}>
              <View style={[styles.msgBubble, styles.bubbleAI, styles.loadingBubble]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Synthesizing tools & context...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.chatInput}
            placeholder="Ask AI or invoke MCP tool..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSend()}
            multiline={false}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || loading) && styles.sendButtonDisabled]}
            onPress={() => handleSend()}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },
  badgeLive: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  badgeLiveText: {
    color: colors.income,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  shortcutsContainer: {
    marginBottom: 12,
  },
  shortcutsScroll: {
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  chatArea: {
    flex: 1,
    marginBottom: 12,
  },
  msgWrapper: {
    marginBottom: 14,
    maxWidth: '85%',
  },
  msgLeft: {
    alignSelf: 'flex-start',
  },
  msgRight: {
    alignSelf: 'flex-end',
  },
  msgBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 2,
  },
  bubbleAI: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 2,
  },
  msgText: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  msgTextUser: {
    color: '#0B0F14',
    fontWeight: '500',
  },
  msgTextAI: {
    color: colors.text,
  },
  msgTime: {
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  toolBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  toolBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  chatInput: {
    flex: 1,
    color: colors.text,
    fontSize: typography.sizes.sm,
    minHeight: 44,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  sendButtonDisabled: {
    opacity: 0.3,
  },
  sendIcon: {
    color: '#0B0F14',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
