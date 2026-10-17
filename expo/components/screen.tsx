import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";

export function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="border-b border-border bg-background px-4 pb-3" style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center gap-2">
        {router.canGoBack() ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-full active:bg-secondary"
          >
            <Text className="text-3xl leading-8 text-primary">‹</Text>
          </Pressable>
        ) : null}
        <View className="flex-1">
          <Text variant="subtitle">{title}</Text>
          {subtitle ? <Text variant="caption">{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

export function SkeletonList({ rows = 6, tall = false }: { rows?: number; tall?: boolean }) {
  return (
    <View className="gap-3 p-4">
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} className={`${tall ? "h-28" : "h-16"} rounded-2xl bg-muted opacity-70`} />
      ))}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="items-center gap-4 p-8">
      <Text className="text-center">{message}</Text>
      <Button variant="tinted" onPress={onRetry}>
        Try again
      </Button>
    </View>
  );
}

export function LoadingNote({ text }: { text: string }) {
  return <Text className="px-4 pt-4 text-center text-muted-foreground">{text}</Text>;
}
