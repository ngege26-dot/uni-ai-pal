import AsyncStorage from "@react-native-async-storage/async-storage";

export type RecentSubject = { name: string; code: string; credits: string };

const RECENT_KEY = "uniprep.recent";
const scoreKey = (subject: string) => `uniprep.scores.${subject.toLowerCase()}`;

/** Best practice score (percent) per difficulty for one subject. */
export async function getBestScores(subject: string): Promise<Record<string, number>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(scoreKey(subject))) ?? "{}");
  } catch {
    return {};
  }
}

export async function recordScore(subject: string, difficulty: string, percent: number) {
  const scores = await getBestScores(subject);
  if ((scores[difficulty] ?? -1) >= percent) return;
  scores[difficulty] = percent;
  await AsyncStorage.setItem(scoreKey(subject), JSON.stringify(scores));
}

export async function getRecent(): Promise<RecentSubject[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(RECENT_KEY)) ?? "[]");
  } catch {
    return [];
  }
}

export async function addRecent(s: RecentSubject) {
  const list = (await getRecent()).filter((r) => r.name !== s.name);
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify([s, ...list].slice(0, 6)));
}
