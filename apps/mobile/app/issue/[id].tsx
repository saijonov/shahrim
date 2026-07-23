import { useLocalSearchParams } from "expo-router";
import IssueDetailScreen from "../../src/screens/IssueDetailScreen";

/** Route wrapper: parse the `id` param and hand it to the detail screen. */
export default function IssueRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numId = Number(id);
  if (!Number.isFinite(numId)) return null;
  return <IssueDetailScreen id={numId} />;
}
