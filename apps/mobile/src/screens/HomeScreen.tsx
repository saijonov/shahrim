import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../AuthContext";
import { useTheme } from "../theme";
import { Button, Meta, Subtitle, Title } from "../components/ui";

/**
 * Home (PRD §6.1): greeting + the two primary citizen actions —
 * "Muammo yuborish" (report, the cobalt→turquoise camera hero) and
 * "Mening murojaatlarim" (history, a quiet row). Plus logout.
 */
export function HomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const firstName = user?.first_name?.trim();

  return (
    <ScrollView
      contentContainerStyle={{
        padding: theme.space[6],
        gap: theme.space[6],
        backgroundColor: theme.color.bg,
        flexGrow: 1,
      }}
    >
      {/* Brand header — the Shahrim logo (same as the web app). */}
      <Image
        source={require("../assets/logo-full.png")}
        style={{ width: 64, height: 56 }}
        resizeMode="contain"
        accessibilityLabel={t("app_name")}
      />

      {/* Greeting — a plain, borderless block (mirrors the Mini App home). */}
      <View style={{ gap: theme.space[2] }}>
        <Title style={{ fontSize: theme.fontSize["2xl"] }}>
          {firstName ? t("greeting", { name: firstName }) : t("greeting_noname")}
        </Title>
        <Subtitle>{t("home_subtitle")}</Subtitle>
        {user?.phone ? (
          <Meta>
            {t("phone_label")}: {user.phone}
          </Meta>
        ) : null}
      </View>

      <View style={{ gap: theme.space[4] }}>
        {/* Camera hero — the primary call to action. */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/report")}
          style={({ pressed }) => [
            {
              borderRadius: theme.radius.xl,
              overflow: "hidden",
              transform: [{ translateY: pressed ? 1 : 0 }],
            },
            theme.primaryShadow,
          ]}
        >
          <LinearGradient
            colors={[theme.color.primary, theme.color.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              minHeight: 132,
              padding: theme.space[6],
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: "rgba(255,255,255,0.18)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 28 }}>📷</Text>
            </View>
            <Text
              style={{
                color: "#FFFFFF",
                fontFamily: theme.font.display,
                fontSize: 23,
                letterSpacing: -0.2,
              }}
            >
              {t("report_problem")}
            </Text>
          </LinearGradient>
        </Pressable>

        {/* My reports — a quiet white row with badge + chevron. */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/reports")}
          style={({ pressed }) => [
            {
              flexDirection: "row",
              alignItems: "center",
              gap: theme.space[4],
              minHeight: 72,
              paddingHorizontal: theme.space[5],
              backgroundColor: theme.color.card,
              borderWidth: 1.5,
              borderColor: theme.color.border,
              borderRadius: theme.radius.xl,
              transform: [{ translateY: pressed ? 1 : 0 }],
            },
            theme.cardShadow,
          ]}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: theme.color.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 22 }}>🗂️</Text>
          </View>
          <Text
            style={{
              flex: 1,
              color: theme.color.text,
              fontFamily: theme.font.display,
              fontSize: theme.fontSize.lg,
              letterSpacing: -0.2,
            }}
          >
            {t("my_reports")}
          </Text>
          <Text style={{ color: theme.color.dim, fontSize: 26 }}>›</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }} />

      <Button
        title={t("logout")}
        variant="secondary"
        onPress={() => {
          void signOut().then(() => router.replace("/login"));
        }}
      />
    </ScrollView>
  );
}

export default HomeScreen;
