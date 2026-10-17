import { router, useLocalSearchParams } from "expo-router";
import { FlatList, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorState, Header, LoadingNote, SkeletonList } from "@/components/screen";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth";
import { backend, useRequest } from "@/lib/backend";
import { TOP_US_UNIVERSITIES } from "@/lib/data";

export default function PastExams() {
  const { name, source } = useLocalSearchParams<{ name: string; source?: string }>();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const university = source ?? profile?.university ?? "";
  const similar = Boolean(source);
  const { data, error, loading, retry } = useRequest(
    () => backend.pastExams(university, name, similar),
    [university, name, similar],
  );

  const openExam = (i: number) =>
    router.push({ pathname: "/exam", params: { name, source: university, similar: similar ? "1" : "0", index: String(i) } });

  return (
    <View className="flex-1 bg-background">
      <Header title="Past tests" subtitle={`${name} · ${university}`} />
      {loading ? (
        <View>
          <LoadingNote text="Looking for past exams…" />
          <SkeletonList rows={3} tall />
        </View>
      ) : error ? (
        <ErrorState message={`We couldn't load past tests. ${error}`} onRetry={retry} />
      ) : data && data.available && data.exams.length > 0 ? (
        <FlatList
          data={data.exams}
          keyExtractor={(e, i) => `${e.year}-${i}`}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 24 }}
          ListHeaderComponent={<Text variant="caption" className="pb-2">{data.note}</Text>}
          renderItem={({ item, index }) => (
            <Pressable onPress={() => openExam(index)} className="min-h-[64px] rounded-2xl bg-card px-4 py-4 active:opacity-70">
              <Text className="font-semibold">{item.title}</Text>
              <Text variant="caption">
                {item.year} · {item.questions.length} questions ·{" "}
                {item.questions.reduce((s, q) => s + q.points, 0)} points
              </Text>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={TOP_US_UNIVERSITIES.filter((u) => u !== university)}
          keyExtractor={(u) => u}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: insets.bottom + 24 }}
          ListHeaderComponent={
            <View className="gap-2 pb-3">
              <Text className="text-lg font-semibold">No practice material from {university} yet</Text>
              <Text className="text-xl font-bold text-primary">See similar uni's tests</Text>
              <Text variant="caption">Top 20 universities in the US — pick one to practise with their exam style.</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => router.push({ pathname: "/past-exams", params: { name, source: item } })}
              className="min-h-[52px] flex-row items-center gap-3 rounded-xl bg-card px-4 active:opacity-70"
            >
              <Text className="w-8 font-bold text-muted-foreground">{index + 1}</Text>
              <Text className="flex-1">{item}</Text>
              <Text className="text-xl text-muted-foreground">›</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
