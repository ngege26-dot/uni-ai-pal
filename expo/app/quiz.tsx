import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorState, Header, LoadingNote, SkeletonList } from "@/components/screen";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth";
import { recordScore } from "@/lib/progress";
import { backend, friendlyError, useRequest, type Insights } from "@/lib/backend";

export default function Quiz() {
  const { name, difficulty } = useLocalSearchParams<{ name: string; difficulty: string }>();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const university = profile?.university ?? "";
  const { data, error, loading, retry } = useRequest(
    () => backend.practice(university, name, difficulty),
    [university, name, difficulty],
  );
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [insights, setInsights] = useState<Insights | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  const label = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  const questions = data?.questions ?? [];
  const q = questions[index];
  const choice = picked[index];
  const answered = choice !== undefined;
  const answeredCount = Object.keys(picked).length;
  const correctCount = Object.entries(picked).filter(([i, c]) => questions[Number(i)]?.correctIndex === c).length;

  const finish = async () => {
    setAnalysing(true);
    setInsightError(null);
    try {
      const results = Object.entries(picked).map(([i, c]) => {
        const qq = questions[Number(i)];
        return {
          question: qq.question,
          picked: qq.options[c] ?? "",
          correct: qq.options[qq.correctIndex] ?? "",
          isCorrect: c === qq.correctIndex,
        };
      });
      if (results.length > 0) {
        void recordScore(name, difficulty, Math.round((correctCount / results.length) * 100)).catch(() => {});
      }
      setInsights(await backend.insights(university, name, difficulty, results));
    } catch (e) {
      setInsightError(`We couldn't create your score prediction. ${friendlyError(e)}`);
    } finally {
      setAnalysing(false);
    }
  };

  const restart = () => {
    setPicked({});
    setIndex(0);
    setInsights(null);
  };

  if (insights) {
    const pct = Math.round((correctCount / Math.max(1, answeredCount)) * 100);
    return (
      <View className="flex-1 bg-background">
        <Header title="Your results" subtitle={`${name} · ${label}`} />
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}>
          <View className="flex-row gap-3">
            <View className="flex-1 items-center gap-1 rounded-2xl bg-card p-4">
              <Text variant="caption">This test</Text>
              <Text className="text-3xl font-bold">{pct}%</Text>
              <Text variant="caption">{`${correctCount} of ${answeredCount} correct`}</Text>
            </View>
            <View className="flex-1 items-center gap-1 rounded-2xl bg-primary p-4">
              <Text className="text-primary-foreground">Predicted exam</Text>
              <Text className="text-3xl font-bold text-primary-foreground">{insights.predictedScore}%</Text>
              <Text className="text-sm text-primary-foreground">estimate by AI</Text>
            </View>
          </View>
          <Text>{insights.summary}</Text>

          {insights.strengths.length ? (
            <View className="gap-1 rounded-2xl bg-card p-4">
              <Text className="font-semibold text-primary">Strengths</Text>
              {insights.strengths.map((s, i) => (
                <Text key={i}>{`• ${s}`}</Text>
              ))}
            </View>
          ) : null}
          {insights.weaknesses.length ? (
            <View className="gap-1 rounded-2xl bg-card p-4">
              <Text className="font-semibold text-destructive">Needs work</Text>
              {insights.weaknesses.map((s, i) => (
                <Text key={i}>{`• ${s}`}</Text>
              ))}
            </View>
          ) : null}

          <Text className="pt-2 text-sm font-bold uppercase text-primary">How to improve</Text>
          {insights.tips.map((t, i) => (
            <View key={i} className="gap-1 rounded-2xl bg-card p-4">
              <Text className="font-semibold">{`${i + 1}. ${t.title}`}</Text>
              <Text>{t.detail}</Text>
            </View>
          ))}

          <View className="flex-row gap-3 pt-2">
            <Button variant="tinted" className="flex-1" onPress={() => setInsights(null)}>
              Review answers
            </Button>
            <Button className="flex-1" onPress={restart}>
              Retake test
            </Button>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Header
        title={`${label} practice`}
        subtitle={questions.length ? `${name} · ${index + 1} of ${questions.length} · ${correctCount} correct` : name}
      />
      {loading ? (
        <View>
          <LoadingNote text="Writing your practice questions — the first time can take a minute…" />
          <SkeletonList rows={4} tall />
        </View>
      ) : error ? (
        <ErrorState message={`We couldn't create the questions. ${error}`} onRetry={retry} />
      ) : !q ? (
        <ErrorState message="No questions were created for this subject." onRetry={retry} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}>
          <Text className="text-lg font-semibold">{q.question}</Text>
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correctIndex;
            const isPicked = i === choice;
            const tone = !answered
              ? "bg-card"
              : isCorrect
                ? "bg-emerald-100 dark:bg-emerald-950"
                : isPicked
                  ? "bg-red-100 dark:bg-red-950"
                  : "bg-card opacity-70";
            return (
              <Pressable
                key={i}
                disabled={answered}
                onPress={() => setPicked((p) => ({ ...p, [index]: i }))}
                className={`min-h-[52px] gap-1 rounded-xl px-4 py-3 ${tone}`}
              >
                <Text>{`${String.fromCharCode(65 + i)}. ${opt}`}</Text>
                {answered && (isPicked || isCorrect) && q.optionFeedback[i] ? (
                  <Text className="text-sm text-foreground">
                    {isCorrect ? "✓ " : "✗ "}
                    {q.optionFeedback[i]}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}

          {answered ? (
            <View className="gap-2 rounded-2xl bg-card p-4">
              <Text className="font-semibold">
                {choice === q.correctIndex ? "Correct — well done!" : "Not quite."}
              </Text>
              <Text className="text-sm font-semibold text-primary">What you did right</Text>
              <Text>
                {choice === q.correctIndex
                  ? q.optionFeedback[choice] ?? "You picked the right answer."
                  : "You engaged with the problem — review the reasoning below to see where it went off track."}
              </Text>
              {choice !== q.correctIndex ? (
                <>
                  <Text className="text-sm font-semibold text-destructive">What went wrong</Text>
                  <Text>{q.optionFeedback[choice] ?? "That option is incorrect."}</Text>
                </>
              ) : null}
              <Text className="text-sm font-semibold text-primary">Explanation</Text>
              <Text>{q.explanation}</Text>
            </View>
          ) : null}

          <View className="flex-row gap-3 pt-2">
            <Button variant="tinted" className="flex-1" disabled={index === 0} onPress={() => setIndex((i) => i - 1)}>
              Previous
            </Button>
            <Button
              className="flex-1"
              disabled={index >= questions.length - 1}
              onPress={() => setIndex((i) => i + 1)}
            >
              Next
            </Button>
          </View>

          <View className="gap-2 pt-2">
            <Button variant="tinted" disabled={answeredCount === 0 || analysing} onPress={finish}>
              {analysing ? "Predicting your score…" : `Finish & predict my score (${answeredCount} answered)`}
            </Button>
            {analysing ? <ActivityIndicator /> : null}
            {insightError ? (
              <Text className="text-sm text-destructive">{insightError}</Text>
            ) : null}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
