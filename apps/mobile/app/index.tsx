import { Redirect } from "expo-router";
import { View } from "react-native";
import { useAuth } from "../src/AuthContext";
import { useTheme } from "../src/theme";
import { Loading } from "../src/components/ui";

/**
 * Auth gate at "/": wait for the token check, then send the citizen to the tab
 * home ("/home") or the login screen.
 */
export default function Index() {
  const { status } = useAuth();
  const theme = useTheme();

  if (status === "loading") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.color.bg,
          justifyContent: "center",
        }}
      >
        <Loading />
      </View>
    );
  }

  return <Redirect href={status === "signed_in" ? "/home" : "/login"} />;
}
