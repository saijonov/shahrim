/**
 * The single shared API client instance for the native app. Reuses the typed
 * `@shahrim/api-client` (same transport/shapes as the Mini App + admin), wired
 * to the native token store and the EXPO_PUBLIC_API_URL base.
 */
import { createClient } from "@shahrim/api-client";
import { API_URL } from "./config";
import { tokenStore } from "./tokenStore";

export const client = createClient({
  baseUrl: API_URL,
  getToken: () => tokenStore.get(),
});

/**
 * A React-Native multipart file descriptor. RN's FormData accepts a
 * `{ uri, name, type }` object where the web APIs expect a `File`/`Blob`; we
 * build that object and hand it to `client.uploadPhoto`, casting to the shared
 * `File`-typed signature.
 */
export interface RNFile {
  uri: string;
  name: string;
  type: string;
}

export function uploadPhotoAsset(uri: string): ReturnType<typeof client.uploadPhoto> {
  const name = uri.split("/").pop() || `photo_${Date.now()}.jpg`;
  const match = /\.(\w+)$/.exec(name);
  const ext = (match?.[1] || "jpg").toLowerCase();
  const type = ext === "png" ? "image/png" : "image/jpeg";
  const file: RNFile = { uri, name, type };
  // RN FormData wants the {uri,name,type} shape; the shared client is typed for
  // the web `File`. The cast is the standard RN upload idiom.
  return client.uploadPhoto(file as unknown as File);
}
