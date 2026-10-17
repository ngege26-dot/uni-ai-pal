import type { Session } from "@supabase/supabase-js";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Platform } from "react-native";

import { supabase } from "@/integrations/supabase/client";

import { apiBaseUrl, isBackendAvailable, setTokenProvider } from "./lovable-api";

WebBrowser.maybeCompleteAuthSession();

setTokenProvider(async () => (await supabase.auth.getSession()).data.session?.access_token ?? null);

export type Profile = { university: string | null; major: string | null };
type Provider = "google" | "apple";

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  ready: boolean;
  signIn: (provider: Provider) => Promise<void>;
  signOut: () => Promise<void>;
  saveProfile: (p: Profile) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

type BrokerResponse = { state?: string; access_token?: string; refresh_token?: string; error?: string; error_description?: string };

function readParams(url: string): BrokerResponse {
  const out: Record<string, string> = {};
  const parts = [url.split("?")[1]?.split("#")[0], url.split("#")[1]];
  for (const part of parts) {
    if (!part) continue;
    new URLSearchParams(part).forEach((v, k) => (out[k] = v));
  }
  return out;
}

function webPopupSignIn(url: string): Promise<BrokerResponse> {
  return new Promise((resolve, reject) => {
    const popup = window.open(url, "oauth", "width=520,height=720");
    if (!popup) return reject(new Error("Your browser blocked the sign-in window. Allow pop-ups and try again."));
    const allowed = ["https://oauth.lovable.app", "https://lovable.dev"];
    const onMessage = (e: MessageEvent) => {
      if (!allowed.includes(e.origin) || e.data?.type !== "authorization_response") return;
      cleanup();
      popup.close();
      resolve(e.data.response as BrokerResponse);
    };
    const timer = setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error("Sign-in was cancelled."));
      }
    }, 500);
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      clearInterval(timer);
    };
    window.addEventListener("message", onMessage);
  });
}

async function oauthSignIn(provider: Provider) {
  if (!isBackendAvailable()) throw new Error("Sign-in isn't available in this preview.");
  const state = Crypto.randomUUID();
  const isWeb = Platform.OS === "web";
  const redirectUri = isWeb ? window.location.origin : Linking.createURL("oauth-callback");
  const params = new URLSearchParams({ provider, redirect_uri: redirectUri, state });
  if (isWeb) params.set("response_mode", "web_message");
  const url = `${apiBaseUrl()}/~oauth/initiate?${params.toString()}`;

  let response: BrokerResponse;
  if (isWeb) {
    response = await webPopupSignIn(url);
  } else {
    const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);
    if (result.type !== "success") throw new Error("Sign-in was cancelled.");
    response = readParams(result.url);
  }
  if (response.state !== state) throw new Error("Sign-in could not be verified. Please try again.");
  if (response.error) throw new Error(response.error_description ?? "Sign-in failed. Please try again.");
  if (!response.access_token || !response.refresh_token) throw new Error("Sign-in failed. Please try again.");
  const { error } = await supabase.auth.setSession({
    access_token: response.access_token,
    refresh_token: response.refresh_token,
  });
  if (error) throw new Error("Sign-in failed. Please try again.");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from("profiles").select("university, major").eq("id", s.user.id).maybeSingle();
    setProfile(data ?? { university: null, major: null });
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setTimeout(() => {
        void loadProfile(s).finally(() => setReady(true));
      }, 0);
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const saveProfile = useCallback(
    async (p: Profile) => {
      if (!session) return;
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: session.user.id, university: p.university, major: p.major, updated_at: new Date().toISOString() });
      if (error) throw new Error("Couldn't save your choice. Please try again.");
      setProfile(p);
    },
    [session],
  );

  const value: AuthState = {
    session,
    profile,
    ready,
    signIn: oauthSignIn,
    signOut: async () => {
      await supabase.auth.signOut();
    },
    saveProfile,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
