import { supabase } from "@/integrations/supabase/client";

export type ClassItem = {
  id: string;
  subject: string;
  days: number[]; // 0 = Monday … 6 = Sunday
  start_minute: number;
  end_minute: number;
  location: string | null;
  color: string;
};

export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_LETTER = ["M", "T", "W", "T", "F", "S", "S"];

// Brand accents readable with white text in both light and dark schemes.
export const COLORS: Record<string, string> = {
  blue: "#2563EB",
  red: "#DC2626",
  green: "#15803D",
  orange: "#C2410C",
  purple: "#7C3AED",
  teal: "#0F766E",
};

export const fmtTime = (m: number) => {
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  return `${String(h).padStart(2, "0")}:${mm}`;
};

/** Parses "HH:MM" into minutes after midnight, or null when invalid. */
export const parseTime = (s: string): number | null => {
  const m = s.trim().match(/^(\d{1,2})[:.]?(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
};

export const schedule = {
  async list(): Promise<ClassItem[]> {
    const { data, error } = await supabase.from("class_schedule").select("*").order("start_minute");
    if (error) throw error;
    return data as ClassItem[];
  },
  async get(id: string): Promise<ClassItem | null> {
    const { data, error } = await supabase.from("class_schedule").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data as ClassItem | null;
  },
  async save(item: Omit<ClassItem, "id"> & { id?: string }) {
    const { id, ...row } = item;
    const { error } = id
      ? await supabase.from("class_schedule").update(row).eq("id", id)
      : await supabase.from("class_schedule").insert(row);
    if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from("class_schedule").delete().eq("id", id);
    if (error) throw error;
  },
};
