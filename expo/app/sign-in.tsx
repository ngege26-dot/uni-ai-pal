import { Redirect, router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth";
import { useThemeColors } from "@/lib/theme";

export default function SignIn() {
  const { session, signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [busy, setBusy] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Redirect href="/" />;

  const go = async (provider: "google" | "apple") => {
    setBusy(provider);
    setError(null);
    try {
      await signIn(provider);
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <View className="flex-1 bg-background px-6" style={{ paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }}>
      <View className="flex-1 justify-center">
        <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-primary">
          <Text className="text-3xl font-bold text-primary-foreground">U</Text>
        </View>
        <Text className="text-4xl font-bold">UniPrep</Text>
        <Text className="mt-3 text-lg text-muted-foreground">
          Every course at your university, with practice questions, past-exam style tests, topic guides and an AI tutor.
        </Text>
      </View>

      <View className="gap-3">
        <Pressable
          accessibilityRole="button"
          disabled={busy !== null}
          onPress={() => go("google")}
          className="min-h-[52px] flex-row items-center justify-center gap-3 rounded-xl bg-primary active:opacity-90"
        >
          {busy === "google" ? <ActivityIndicator color={colors.primaryForeground} /> : null}
          <Text className="font-semibold text-primary-foreground">Continue with Google</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy !== null}
          onPress={() => go("apple")}
          className="min-h-[52px] flex-row items-center justify-center gap-3 rounded-xl bg-foreground active:opacity-90"
        >
          {busy === "apple" ? <ActivityIndicator color={colors.background} /> : null}
          <Text className="font-semibold text-background">Continue with Apple</Text>
        </Pressable>
        {error ? <Text className="text-center text-destructive">{error}</Text> : null}
        <Pressable onPress={() => router.push("/privacy")} className="min-h-[44px] items-center justify-center">
          <Text variant="caption">Privacy policy</Text>
        </Pressable>
      </View>
    </View>
  );
}
