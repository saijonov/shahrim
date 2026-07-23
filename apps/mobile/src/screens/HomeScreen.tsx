import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../AuthContext";
import { useTheme } from "../theme";
import { Button, Card, Meta, Subtitle, Title } from "../components/ui";

/**
 * Home (PRD §6.1): greeting + the two primary citizen actions —
 * "Muammo yuborish" (report) and "Mening murojaatlarim" (history). Plus logout.
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
      <Card>
        <Title>
          {firstName ? t("greeting", { name: firstName }) : t("greeting_noname")}
        </Title>
        <Subtitle>{t("home_subtitle")}</Subtitle>
        {user?.phone ? (
          <Meta>
            {t("phone_label")}: {user.phone}
          </Meta>
        ) : null}
      </Card>

      <View style={{ gap: theme.space[4] }}>
        <Button
          title={t("report_problem")}
          onPress={() => router.push("/report")}
        />
        <Button
          title={t("my_reports")}
          variant="secondary"
          onPress={() => router.push("/reports")}
        />
      </View>

      <View style={{ flex: 1 }} />

      <Button
        title={t("logout")}
        variant="secondary"
        onPress={() => {
          void signOut().then(() => router.replace("/login"));
        }}
        style={{ borderColor: theme.color.border }}
      />
    </ScrollView>
  );
}

export default HomeScreen;
