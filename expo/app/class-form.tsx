import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Header } from "@/components/screen";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { COLORS, DAY_SHORT, fmtTime, parseTime, schedule } from "@/lib/schedule";

export default function ClassForm() {
  const params = useLocalSearchParams<{ id?: string; subject?: string }>();
  const insets = useSafeAreaInsets();
  const [subject, setSubject] = useState(params.subject ?? "");
  const [days, setDays] = useState<number[]>([]);
  const [start, setStart] = useState("12:00");
  const [end, setEnd] = useState("13:00");
  const [location, setLocation] = useState("");
  const [color, setColor] = useState("blue");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    schedule
      .get(params.id)
      .then((c) => {
        if (!c) return;
        setSubject(c.subject);
        setDays(c.days);
        setStart(fmtTime(c.start_minute));
        setEnd(fmtTime(c.end_minute));
        setLocation(c.location ?? "");
        setColor(c.color);
      })
      .catch(() => setError("We couldn't load this class."));
  }, [params.id]);

  const toggle = (d: number) => setDays((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort()));

  const save = async () => {
    const s = parseTime(start);
    const e = parseTime(end);
    if (!subject.trim()) return setError("Enter the subject name.");
    if (days.length === 0) return setError("Pick at least one day.");
    if (s === null || e === null) return setError("Write times like 12:00.");
    if (e <= s) return setError("The end time must be after the start time.");
    setBusy(true);
    setError(null);
    try {
      await schedule.save({
        id: params.id,
        subject: subject.trim(),
        days,
        start_minute: s,
        end_minute: e,
        location: location.trim() || null,
        color,
      });
      router.back();
    } catch {
      setError("We couldn't save this class. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!params.id) return;
    setBusy(true);
    try {
      await schedule.remove(params.id);
      router.back();
    } catch {
      setError("We couldn't delete this class. Try again.");
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} className="bg-background">
      <Header title={params.id ? "Edit class" : "Add class"} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
      >
        <Text variant="caption">Subject</Text>
        <Input value={subject} onChangeText={setSubject} placeholder="e.g. Discrete Mathematics" />

        <Text variant="caption">Days</Text>
        <View className="flex-row flex-wrap gap-2">
          {DAY_SHORT.map((d, i) => (
            <Pressable
              key={d}
              onPress={() => toggle(i)}
              className={`min-h-[44px] justify-center rounded-full px-4 ${days.includes(i) ? "bg-primary" : "bg-secondary"}`}
            >
              <Text className={days.includes(i) ? "font-semibold text-primary-foreground" : "text-foreground"}>{d}</Text>
            </Pressable>
          ))}
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 gap-1">
            <Text variant="caption">Starts</Text>
            <Input value={start} onChangeText={setStart} placeholder="12:00" keyboardType="numbers-and-punctuation" />
          </View>
          <View className="flex-1 gap-1">
            <Text variant="caption">Ends</Text>
            <Input value={end} onChangeText={setEnd} placeholder="13:00" keyboardType="numbers-and-punctuation" />
          </View>
        </View>

        <Text variant="caption">Room (optional)</Text>
        <Input value={location} onChangeText={setLocation} placeholder="e.g. Building 2, Room 101" />

        <Text variant="caption">Color</Text>
        <View className="flex-row flex-wrap gap-2">
          {Object.entries(COLORS).map(([key, hex]) => (
            <Pressable
              key={key}
              accessibilityLabel={key}
              onPress={() => setColor(key)}
              className="min-h-[44px] min-w-[44px] items-center justify-center"
            >
              <View
                className={`h-8 w-8 rounded-full ${color === key ? "border-2 border-foreground" : ""}`}
                style={{ backgroundColor: hex }}
              />
            </Pressable>
          ))}
        </View>

        {error ? <Text className="text-destructive">{error}</Text> : null}
        <Button disabled={busy} onPress={save} className="min-h-[52px]">
          {busy ? "Saving…" : "Save"}
        </Button>
        {params.id ? (
          <Button variant="ghost" disabled={busy} onPress={remove}>
            Delete class
          </Button>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
