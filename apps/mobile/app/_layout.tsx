import "../src/i18n";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTranslation } from "react-i18next";
import { useFonts } from "expo-font";
import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from "@expo-google-fonts/figtree";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/AuthContext";
import { useTheme } from "../src/theme";

/**
 * Root layout: load the brand fonts (Bricolage Grotesque display + Figtree
 * body), then mount the global providers (safe-area, gesture-handler root,
 * i18n, auth) and the root Stack. The app is light-only, so the status bar is
 * always dark-on-light. The tab group and the auth/gate screens are header-less;
 * the pushed report + detail screens get a themed native header with an Uzbek
 * title and an automatic back button.
 */
export default function RootLayout() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [fontsLoaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });

  // Gate render until the fonts are ready so typography never flashes a
  // fallback face. (The native splash stays up until the first frame.)
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.color.bg },
              headerShadowVisible: false,
              headerTintColor: theme.color.primary,
              headerTitleStyle: {
                color: theme.color.text,
                fontFamily: theme.font.display,
              },
              contentStyle: { backgroundColor: theme.color.bg },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
            <Stack.Screen name="report" options={{ title: t("report_problem") }} />
            <Stack.Screen name="issue/[id]" options={{ title: t("my_reports") }} />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
