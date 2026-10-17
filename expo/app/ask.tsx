import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Header } from "@/components/screen";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth";
import { backend, friendlyError, type ChatMessage } from "@/lib/backend";

export default function Ask() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || thinking) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setThinking(true);
    setError(null);
    try {
      const { answer } = await backend.ask(profile?.university ?? "", name, next.slice(-20));
      setMessages((m) => [...m, { role: "assistant", content: answer }]);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setThinking(false);
    }
  };

  const suggestions = [`How many credits is ${name}?`, "What are the prerequisites?", "How should I prepare for the final?"];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} className="bg-background">
      <Header title="Ask AI" subtitle={name} />
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
        ListEmptyComponent={
          <View className="flex-1 justify-center gap-3">
            <Text className="text-center text-muted-foreground">
              Ask anything about {name} — credits, topics, homework, exam tips.
            </Text>
            {suggestions.map((s) => (
              <Pressable key={s} onPress={() => send(s)} className="min-h-[44px] justify-center rounded-full bg-secondary px-4">
                <Text className="text-center">{s}</Text>
              </Pressable>
            ))}
          </View>
        }
        ListFooterComponent={
          <View className="gap-2">
            {thinking ? (
              <View className="h-10 w-24 rounded-2xl bg-muted opacity-70" />
            ) : null}
            {error ? (
              <View className="gap-2">
                <Text className="text-destructive">{error}</Text>
                <Pressable
                  onPress={() => {
                    const last = messages[messages.length - 1];
                    if (last?.role === "user") {
                      setMessages((m) => m.slice(0, -1));
                      void send(last.content);
                    }
                  }}
                  className="min-h-[44px] justify-center"
                >
                  <Text className="text-primary">Try again</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) =>
          item.role === "user" ? (
            <View className="max-w-[85%] self-end rounded-2xl bg-primary px-4 py-3">
              <Text className="text-primary-foreground">{item.content}</Text>
            </View>
          ) : (
            <View className="max-w-[95%] self-start">
              <Text>{item.content}</Text>
            </View>
          )
        }
      />
      <View className="flex-row items-end gap-2 border-t border-border px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
        <Input
          className="flex-1"
          value={input}
          onChangeText={setInput}
          placeholder="Ask a question"
          multiline
          onSubmitEditing={() => send(input)}
          autoFocus
        />
        <Pressable
          accessibilityLabel="Send"
          disabled={!input.trim() || thinking}
          onPress={() => send(input)}
          className={`min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-primary ${!input.trim() || thinking ? "opacity-40" : ""}`}
        >
          <Text className="text-lg font-bold text-primary-foreground">↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
