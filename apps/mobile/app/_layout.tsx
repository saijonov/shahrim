import "../src/i18n";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTranslation } from "react-i18next";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/AuthContext";
import { useTheme } from "../src/theme";

/**
 * Root layout: global providers (safe-area, gesture-handler root, i18n, auth)
 * and the root Stack. The tab group and the auth/gate screens are header-less;
 * the pushed report + detail screens get a themed native header with an Uzbek
 * title and an automatic back button.
 */
export default function RootLayout() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.color.card },
              headerTintColor: theme.color.text,
              headerTitleStyle: { color: theme.color.text },
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
