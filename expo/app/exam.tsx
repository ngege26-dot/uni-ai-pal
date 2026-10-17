import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorState, Header, SkeletonList } from "@/components/screen";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { backend, friendlyError, useRequest, type Grade } from "@/lib/backend";

type Slot = { answer: string; grading: boolean; grade?: Grade; error?: string };

export default function Exam() {
  const { name, source, similar, index } = useLocalSearchParams<{ name: string; source: string; similar: string; index: string }>();
  const insets = useSafeAreaInsets();
  const { data, error, loading, retry } = useRequest(
    () => backend.pastExams(source, name, similar === "1"),
    [source, name, similar],
  );
  const exam = data?.exams[Number(index)];
  const [slots, setSlots] = useState<Record<number, Slot>>({});

  const update = (i: number, patch: Partial<Slot>) =>
    setSlots((s) => ({ ...s, [i]: { ...(s[i] ?? { answer: "", grading: false }), ...patch } }));

  const submit = async (i: number) => {
    const q = exam?.questions[i];
    const answer = slots[i]?.answer.trim();
    if (!q || !answer) return;
    update(i, { grading: true, error: undefined });
    try {
      const grade = await backend.grade(name, q.prompt, answer, q.points);
      update(i, { grading: false, grade });
    } catch (e) {
      update(i, { grading: false, error: `We couldn't check this answer. ${friendlyError(e)}` });
    }
  };

  const total = exam?.questions.reduce((s, q) => s + q.points, 0) ?? 0;
  const scored = Object.values(slots).reduce((s, x) => s + (x.grade?.score ?? 0), 0);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} className="bg-background">
      <Header title={exam?.title ?? "Past test"} subtitle={exam ? `${source} · ${exam.year} · ${scored}/${total} points` : source} />
      {loading ? (
        <SkeletonList rows={3} tall />
      ) : error ? (
        <ErrorState message={`We couldn't open this test. ${error}`} onRetry={retry} />
      ) : !exam ? (
        <ErrorState message="This test could not be found." onRetry={retry} />
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }}>
          {exam.questions.map((q, i) => {
            const slot = slots[i];
            return (
              <View key={i} className="gap-3 rounded-2xl bg-card p-4">
                <Text variant="caption">
                  Question {i + 1} · {q.points} points
                </Text>
                <Text className="font-semibold">{q.prompt}</Text>
                <Input
                  multiline
                  value={slot?.answer ?? ""}
                  onChangeText={(t) => update(i, { answer: t })}
                  placeholder="Write your answer"
                  className="min-h-[100px]"
                  style={{ textAlignVertical: "top" }}
                />
                {slot?.grading ? (
                  <View className="min-h-[44px] flex-row items-center justify-center gap-2">
                    <ActivityIndicator />
                    <Text variant="caption">Checking your answer…</Text>
                  </View>
                ) : (
                  <Button variant="tinted" disabled={!slot?.answer?.trim()} onPress={() => submit(i)}>
                    {slot?.grade ? "Check again" : "Check answer"}
                  </Button>
                )}
                {slot?.error ? <Text className="text-destructive">{slot.error}</Text> : null}
                {slot?.grade ? (
                  <View className="gap-2 border-t border-border pt-3">
                    <Text className="font-semibold">
                      Score: {slot.grade.score}/{q.points}
                    </Text>
                    {slot.grade.didRight.length ? (
                      <>
                        <Text className="text-sm font-semibold text-primary">What you did right</Text>
                        {slot.grade.didRight.map((t, k) => (
                          <Text key={k}>✓ {t}</Text>
                        ))}
                      </>
                    ) : null}
                    {slot.grade.didWrong.length ? (
                      <>
                        <Text className="text-sm font-semibold text-destructive">What you did wrong</Text>
                        {slot.grade.didWrong.map((t, k) => (
                          <Text key={k}>✗ {t}</Text>
                        ))}
                      </>
                    ) : null}
                    <Text className="text-sm font-semibold">Model answer</Text>
                    <Text>{slot.grade.modelAnswer}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
