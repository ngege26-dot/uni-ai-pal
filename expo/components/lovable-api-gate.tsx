// lovable-skill: expo-backend-api@2. A newer skill release replaces this file; extend behavior in app code.
import { useEffect, useState, type ReactNode } from "react";
import { AppState, StyleSheet, Text, View, useColorScheme } from "react-native";

import { checkApiVersion, isUpdateRequired, onUpdateRequiredChange } from "../lib/lovable-api";

export function LovableApiGate({ children }: { children: ReactNode }) {
  const [updateRequired, setUpdateRequired] = useState(isUpdateRequired);
  const dark = useColorScheme() === "dark";

  useEffect(() => {
    const unsubscribe = onUpdateRequiredChange(setUpdateRequired);
    setUpdateRequired(isUpdateRequired());
    void checkApiVersion();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void checkApiVersion();
    });
    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, []);

  if (!updateRequired) return <>{children}</>;

  return (
    <View style={[styles.screen, dark && styles.screenDark]}>
      <Text accessibilityRole="header" style={[styles.title, dark && styles.titleDark]}>
        Update required
      </Text>
      <Text style={[styles.body, dark && styles.bodyDark]}>
        This version of the app is no longer supported. Install the latest version from the app store to continue.
      </Text>
    </View>
  );
}

// Plain StyleSheet: the installed file must render the same in an app without NativeWind.
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: "#ffffff",
  },
  screenDark: { backgroundColor: "#0a0a0a" },
  title: { textAlign: "center", fontSize: 24, fontWeight: "600", color: "#111827" },
  titleDark: { color: "#f9fafb" },
  body: { marginTop: 12, textAlign: "center", fontSize: 16, color: "#4b5563" },
  bodyDark: { color: "#9ca3af" },
});
