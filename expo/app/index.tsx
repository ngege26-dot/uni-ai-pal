import { Redirect } from "expo-router";
import { View } from "react-native";

import { useAuth } from "@/lib/auth";

export default function Index() {
  const { session, profile, ready } = useAuth();
  if (!ready) return <View className="flex-1 bg-background" />;
  if (!session) return <Redirect href="/sign-in" />;
  if (!profile?.university || !profile?.major) return <Redirect href="/onboarding" />;
  return <Redirect href="/subjects" />;
}
