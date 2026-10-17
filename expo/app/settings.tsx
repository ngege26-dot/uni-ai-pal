import { router } from "expo-router";
import { useState } from "react";
import { Alert, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Header } from "@/components/screen";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth";
import { backend, friendlyError } from "@/lib/backend";

export default function Settings() {
  const { session, profile, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const doDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await backend.deleteAccount();
      await signOut();
      router.replace("/sign-in");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setDeleting(false);
    }
  };

  const confirmDelete = () => {
    const msg = "This permanently deletes your account and saved choices.";
    if (Platform.OS === "web") {
      if (window.confirm(msg)) void doDelete();
      return;
    }
    Alert.alert("Delete account?", msg, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void doDelete() },
    ]);
  };

  return (
    <View className="flex-1 bg-background">
      <Header title="Settings" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}>
        <View className="gap-1 rounded-2xl bg-card p-4">
          <Text variant="caption">Signed in as</Text>
          <Text className="font-semibold">{session?.user.email ?? "—"}</Text>
          <Text variant="caption" className="pt-2">
            University & major
          </Text>
          <Text>{profile?.university}</Text>
          <Text>{profile?.major}</Text>
        </View>
        <Button variant="tinted" onPress={() => router.push("/onboarding")}>
          Change university or major
        </Button>
        <Button variant="tinted" onPress={() => router.push("/privacy")}>
          Privacy policy
        </Button>
        <Button
          variant="tinted"
          onPress={async () => {
            await signOut();
            router.replace("/sign-in");
          }}
        >
          Sign out
        </Button>
        <Button variant="ghost" disabled={deleting} onPress={confirmDelete}>
          {deleting ? "Deleting…" : "Delete account"}
        </Button>
        {error ? <Text className="text-center text-destructive">{error}</Text> : null}
      </ScrollView>
    </View>
  );
}
