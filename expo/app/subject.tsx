import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Header } from "@/components/screen";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth";
import { backend } from "@/lib/backend";

const DIFFICULTIES = [
  { key: "easy", label: "Easy", note: "30 questions · fundamentals" },
  { key: "medium", label: "Medium", note: "30 questions · applied problems" },
  { key: "hard", label: "Hard", note: "30 questions · exam-level challenges" },
];

export default function SubjectHub() {
  const { name, code, credits } = useLocalSearchParams<{ name: string; code?: string; credits?: string }>();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const university = profile?.university ?? "";

  // Start preparing the most-used material in the background so it is ready when tapped.
  useEffect(() => {
    if (!university || !name) return;
    backend.topics(university, name).catch(() => {});
    backend.practice(university, name, "easy").catch(() => {});
  }, [university, name]);

  const Tile = ({ title, note, onPress }: { title: string; note: string; onPress: () => void }) => (
    <Pressable onPress={onPress} className="min-h-[64px] flex-row items-center gap-3 rounded-2xl bg-card px-4 py-4 active:opacity-70">
      <View className="flex-1">
        <Text className="font-semibold">{title}</Text>
        <Text variant="caption">{note}</Text>
      </View>
      <Text className="text-xl text-muted-foreground">›</Text>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-background">
      <Header title={name} subtitle={[code, credits ? `${credits} credits` : null].filter(Boolean).join(" · ")} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}>
        <Text className="pt-2 text-sm font-bold uppercase text-primary">Practice</Text>
        {DIFFICULTIES.map((d) => (
          <Tile
            key={d.key}
            title={d.label}
            note={d.note}
            onPress={() => router.push({ pathname: "/quiz", params: { name, difficulty: d.key } })}
          />
        ))}
        <Tile
          title="Past tests"
          note="Exam-style papers from previous years, with feedback on every answer"
          onPress={() => router.push({ pathname: "/past-exams", params: { name } })}
        />
        <Tile
          title="Topics"
          note="Study guide covering each topic, explained by AI"
          onPress={() => router.push({ pathname: "/topics", params: { name } })}
        />

        <Text className="pt-4 text-sm font-bold uppercase text-primary">Ask AI</Text>
        <Tile
          title="Ask AI about this subject"
          note="Credits, prerequisites, concepts, homework help — ask anything"
          onPress={() => router.push({ pathname: "/ask", params: { name } })}
        />

        <Text className="pt-4 text-sm font-bold uppercase text-primary">Schedule</Text>
        <Tile
          title="Add to my calendar"
          note="Set the days and times this class meets"
          onPress={() => router.push({ pathname: "/class-form", params: { subject: name } })}
        />
      </ScrollView>
    </View>
  );
}
