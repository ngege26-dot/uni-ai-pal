import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorState, Header, LoadingNote, SkeletonList } from "@/components/screen";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth";
import { backend, useRequest } from "@/lib/backend";

export default function Topics() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const university = profile?.university ?? "";
  const { data, error, loading, retry } = useRequest(() => backend.topics(university, name), [university, name]);
  const [open, setOpen] = useState<number | null>(0);

  return (
    <View className="flex-1 bg-background">
      <Header title="Topics" subtitle={name} />
      {loading ? (
        <View>
          <LoadingNote text="Preparing your study guide…" />
          <SkeletonList rows={6} />
        </View>
      ) : error ? (
        <ErrorState message={`We couldn't load the topics. ${error}`} onRetry={retry} />
      ) : (
        <FlatList
          data={data?.topics ?? []}
          keyExtractor={(t, i) => `${i}-${t.title}`}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 24 }}
          renderItem={({ item, index }) => (
            <View className="rounded-2xl bg-card">
              <Pressable
                onPress={() => setOpen(open === index ? null : index)}
                className="min-h-[56px] flex-row items-center gap-3 px-4 py-3"
              >
                <Text className="w-7 font-bold text-primary">{index + 1}</Text>
                <Text className="flex-1 font-semibold">{item.title}</Text>
                <Text className="text-muted-foreground">{open === index ? "−" : "+"}</Text>
              </Pressable>
              {open === index ? (
                <View className="gap-2 px-4 pb-4">
                  <Text>{item.summary}</Text>
                  <Text className="pt-1 text-sm font-semibold text-primary">Key points</Text>
                  {item.keyPoints.map((p, k) => (
                    <Text key={k}>• {p}</Text>
                  ))}
                  <Text className="pt-1 text-sm font-semibold text-primary">Example</Text>
                  <Text>{item.example}</Text>
                </View>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}
