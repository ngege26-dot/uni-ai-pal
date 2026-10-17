import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Header } from "@/components/screen";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth";
import { MAJORS, UNIVERSITIES } from "@/lib/data";

export default function Onboarding() {
  const { profile, saveProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<"university" | "major">("university");
  const [university, setUniversity] = useState(profile?.university ?? "");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = step === "university" ? UNIVERSITIES : MAJORS;
  const filtered = useMemo(
    () => list.filter((x) => x.toLowerCase().includes(query.trim().toLowerCase())),
    [list, query],
  );
  const custom = query.trim();
  const showCustom = custom.length >= 2 && !list.some((x) => x.toLowerCase() === custom.toLowerCase());

  const pick = async (value: string) => {
    if (step === "university") {
      setUniversity(value);
      setQuery("");
      setStep("major");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveProfile({ university, major: value });
      router.replace("/subjects");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} className="bg-background">
      <Header
        title={step === "university" ? "Choose your university" : "Choose your major"}
        subtitle={step === "university" ? "Step 1 of 2" : `${university} · Step 2 of 2`}
      />
      <View className="px-4 pt-3">
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={step === "university" ? "Search or type your university" : "Search or type your major"}
          autoCorrect={false}
        />
        {error ? <Text className="pt-2 text-destructive">{error}</Text> : null}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(x) => x}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 8 }}
        ListHeaderComponent={
          showCustom ? (
            <Button variant="tinted" onPress={() => pick(custom)} disabled={saving} className="mb-2">
              {`Use "${custom}"`}
            </Button>
          ) : null
        }
        ListEmptyComponent={showCustom ? null : <Text variant="caption">Type the name to add it.</Text>}
        renderItem={({ item }) => (
          <Pressable
            disabled={saving}
            onPress={() => pick(item)}
            className="min-h-[52px] justify-center rounded-xl bg-card px-4 active:opacity-70"
          >
            <Text>{item}</Text>
          </Pressable>
        )}
      />
      {step === "major" ? (
        <View className="px-4" style={{ paddingBottom: insets.bottom + 8 }}>
          <Button variant="ghost" onPress={() => setStep("university")}>
            Change university
          </Button>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
