import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorState, Header, SkeletonList } from "@/components/screen";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { COLORS, DAY_LETTER, DAY_SHORT, fmtTime, schedule, type ClassItem } from "@/lib/schedule";

const HOUR_H = 56;
const START_HOUR = 7;
const END_HOUR = 23;

const todayIndex = () => (new Date().getDay() + 6) % 7;

function weekDates(offset: number) {
  const now = new Date();
  now.setDate(now.getDate() + offset * 7);
  const monday = new Date(now);
  monday.setDate(now.getDate() - todayIndex());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function Calendar() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ClassItem[] | null>(null);
  const [error, setError] = useState(false);
  const [day, setDay] = useState(todayIndex());
  const [week, setWeek] = useState(0);
  const dates = useMemo(() => weekDates(week), [week]);
  const monthLabel = dates[0].toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const load = useCallback(() => {
    setError(false);
    schedule.list().then(setItems).catch(() => setError(true));
  }, []);
  useFocusEffect(load);

  const dayItems = (items ?? []).filter((c) => c.days.includes(day));
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  return (
    <View className="flex-1 bg-background">
      <Header
        title="Calendar"
        subtitle="Your weekly classes"
        right={
          <Pressable
            accessibilityLabel="Add class"
            onPress={() => router.push("/class-form")}
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-full active:bg-secondary"
          >
            <Text className="text-3xl leading-8 text-primary">+</Text>
          </Pressable>
        }
      />
      <View className="flex-row items-center px-2 pt-2">
        <Pressable
          accessibilityLabel="Previous week"
          onPress={() => setWeek((w) => w - 1)}
          className="min-h-[44px] min-w-[44px] items-center justify-center rounded-full active:bg-secondary"
        >
          <Text className="text-3xl leading-8 text-primary">‹</Text>
        </Pressable>
        <Text className="flex-1 text-center font-semibold">{monthLabel}</Text>
        {week !== 0 ? (
          <Pressable
            onPress={() => {
              setWeek(0);
              setDay(todayIndex());
            }}
            className="min-h-[44px] justify-center px-2"
          >
            <Text className="text-primary">Today</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityLabel="Next week"
          onPress={() => setWeek((w) => w + 1)}
          className="min-h-[44px] min-w-[44px] items-center justify-center rounded-full active:bg-secondary"
        >
          <Text className="text-3xl leading-8 text-primary">›</Text>
        </Pressable>
      </View>
      <View className="flex-row justify-between border-b border-border px-2 py-2">
        {DAY_LETTER.map((l, i) => {
          const selected = i === day;
          const isToday = week === 0 && i === todayIndex();
          const has = (items ?? []).some((c) => c.days.includes(i));
          return (
            <Pressable
              key={i}
              accessibilityLabel={DAY_SHORT[i]}
              onPress={() => setDay(i)}
              className="min-h-[60px] min-w-[44px] flex-1 items-center justify-center gap-1"
            >
              <Text variant="caption">{l}</Text>
              <View
                className={`h-9 w-9 items-center justify-center rounded-full ${selected ? (isToday ? "bg-destructive" : "bg-foreground") : ""}`}
              >
                <Text
                  className={`font-semibold ${selected ? "text-background" : isToday ? "text-destructive" : "text-foreground"}`}
                >
                  {dates[i].getDate()}
                </Text>
              </View>
              <View className={`h-1 w-1 rounded-full ${has ? "bg-muted-foreground" : ""}`} />
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <ErrorState message="We couldn't load your calendar." onRetry={load} />
      ) : !items ? (
        <SkeletonList rows={5} />
      ) : items.length === 0 ? (
        <View className="items-center gap-4 p-8">
          <Text className="text-center text-muted-foreground">Your classes will appear here once you add them.</Text>
          <Button onPress={() => router.push("/class-form")}>Add your first class</Button>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          <Text className="px-4 pt-3 font-semibold">
            {dates[day].toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </Text>
          <View style={{ height: hours.length * HOUR_H + 16, marginTop: 8 }}>
            {hours.map((h, i) => (
              <View key={h} className="absolute left-0 right-0 flex-row items-start" style={{ top: i * HOUR_H }}>
                <Text variant="caption" className="w-14 pr-2 text-right text-xs" style={{ marginTop: -8 }}>
                  {String(h).padStart(2, "0")}:00
                </Text>
                <View className="flex-1 border-t border-border" />
              </View>
            ))}
            {dayItems.map((c) => {
              const top = ((c.start_minute - START_HOUR * 60) / 60) * HOUR_H;
              const height = Math.max(((c.end_minute - c.start_minute) / 60) * HOUR_H, 28);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => router.push({ pathname: "/class-form", params: { id: c.id } })}
                  className="absolute rounded-lg px-2 py-1 active:opacity-80"
                  style={{ top, height, left: 60, right: 12, backgroundColor: COLORS[c.color] ?? COLORS.blue }}
                >
                  <Text className="text-sm font-semibold text-white" numberOfLines={1}>
                    {c.subject}
                  </Text>
                  <Text className="text-xs text-white" numberOfLines={1}>
                    {fmtTime(c.start_minute)}–{fmtTime(c.end_minute)}
                    {c.location ? ` · ${c.location}` : ""}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {dayItems.length === 0 ? (
            <Text className="px-4 text-center text-muted-foreground">No classes on {DAY_SHORT[day]}.</Text>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
