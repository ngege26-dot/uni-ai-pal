import { Redirect, router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorState, Header, LoadingNote, SkeletonList } from "@/components/screen";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth";
import { backend, useRequest, type Subject } from "@/lib/backend";

type Row = { kind: "letter"; letter: string } | { kind: "subject"; subject: Subject };

export default function Subjects() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [onlyMajor, setOnlyMajor] = useState(false);
  const university = profile?.university ?? "";
  const major = profile?.major ?? "";
  const { data, error, loading, retry } = useRequest(() => backend.subjects(university, major), [university, major]);

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    const list = (data?.subjects ?? []).filter(
      (s) =>
        (!onlyMajor || s.relatedToMajor) &&
        (!q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)),
    );
    const out: Row[] = [];
    let last = "";
    for (const s of list) {
      const letter = s.name[0]?.toUpperCase() ?? "#";
      if (letter !== last) out.push({ kind: "letter", letter });
      last = letter;
      out.push({ kind: "subject", subject: s });
    }
    return out;
  }, [data, query, onlyMajor]);

  if (!profile?.university || !profile?.major) return <Redirect href="/onboarding" />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} className="bg-background">
      <Header
        title="Subjects A–Z"
        subtitle={`${university} · ${major}`}
        right={
          <Pressable
            accessibilityLabel="Settings"
            onPress={() => router.push("/settings")}
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-full active:bg-secondary"
          >
            <Text className="text-xl text-primary">⚙︎</Text>
          </Pressable>
        }
      />
      <View className="gap-3 px-4 pt-3">
        <Input value={query} onChangeText={setQuery} placeholder="Search subjects or course codes" autoCorrect={false} />
        <View className="flex-row gap-2">
          {[
            { label: "All subjects", value: false },
            { label: `My major`, value: true },
          ].map((chip) => (
            <Pressable
              key={chip.label}
              onPress={() => setOnlyMajor(chip.value)}
              className={`min-h-[44px] justify-center rounded-full px-4 ${onlyMajor === chip.value ? "bg-primary" : "bg-secondary"}`}
            >
              <Text className={onlyMajor === chip.value ? "font-semibold text-primary-foreground" : "text-foreground"}>
                {chip.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {loading ? (
        <View>
          <LoadingNote text="Building your university's course list…" />
          <SkeletonList rows={8} />
        </View>
      ) : error ? (
        <ErrorState message={`We couldn't load the subjects. ${error}`} onRetry={retry} />
      ) : (
        <FlatList
          data={rows}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(r) => (r.kind === "letter" ? `L-${r.letter}` : `S-${r.subject.code}-${r.subject.name}`)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={
            <Text className="pt-8 text-center text-muted-foreground">No subjects match "{query}".</Text>
          }
          renderItem={({ item }) =>
            item.kind === "letter" ? (
              <Text className="pb-1 pt-4 text-sm font-bold text-primary">{item.letter}</Text>
            ) : (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/subject",
                    params: { name: item.subject.name, code: item.subject.code, credits: String(item.subject.credits) },
                  })
                }
                className="mb-2 min-h-[56px] flex-row items-center gap-3 rounded-xl bg-card px-4 py-3 active:opacity-70"
              >
                <View className="flex-1">
                  <Text className="font-semibold">{item.subject.name}</Text>
                  <Text variant="caption" numberOfLines={1}>
                    {item.subject.code} · {item.subject.credits} credits
                  </Text>
                </View>
                <Text className="text-xl text-muted-foreground">›</Text>
              </Pressable>
            )
          }
        />
      )}
    </KeyboardAvoidingView>
  );
}
