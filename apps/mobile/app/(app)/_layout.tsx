import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../src/AuthContext";
import { useTheme } from "../../src/theme";

/**
 * Authenticated tab shell (Home + My reports). Also guards the group: a
 * signed-out user hitting any tab route is bounced to /login.
 */
export default function AppLayout() {
  const { status } = useAuth();
  const { t } = useTranslation();
  const theme = useTheme();

  if (status === "loading") return null;
  if (status !== "signed_in") return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.color.bg },
        headerShadowVisible: false,
        headerTitleStyle: {
          color: theme.color.text,
          fontFamily: theme.font.display,
        },
        headerTintColor: theme.color.primary,
        tabBarActiveTintColor: theme.color.primary,
        tabBarInactiveTintColor: theme.color.muted,
        tabBarLabelStyle: { fontFamily: theme.font.medium },
        tabBarStyle: {
          backgroundColor: theme.color.card,
          borderTopColor: theme.color.border,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t("app_name"),
          tabBarLabel: t("tab_home"),
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 18 }}>🏠</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: t("my_reports"),
          tabBarLabel: t("tab_reports"),
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 18 }}>🗂️</Text>
          ),
        }}
      />
    </Tabs>
  );
}
