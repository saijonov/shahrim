import { buildTelegramLoginUrl, isValidStartPayload } from "../src/auth-url";

describe("buildTelegramLoginUrl", () => {
  it("builds the t.me deep link with the login_<nonce> payload", () => {
    expect(buildTelegramLoginUrl("ShahrimSamarqandBot", "abc-123")).toBe(
      "https://t.me/ShahrimSamarqandBot?start=login_abc-123",
    );
  });

  it("strips a leading @ from the bot username", () => {
    expect(buildTelegramLoginUrl("@ShahrimBot", "n1")).toBe(
      "https://t.me/ShahrimBot?start=login_n1",
    );
  });

  it("accepts a UUID nonce (hyphens allowed)", () => {
    const nonce = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
    expect(buildTelegramLoginUrl("Bot", nonce)).toBe(
      `https://t.me/Bot?start=login_${nonce}`,
    );
  });

  it("rejects a nonce that would make an invalid start payload", () => {
    expect(() => buildTelegramLoginUrl("Bot", "has space")).toThrow();
  });
});

describe("isValidStartPayload", () => {
  it("accepts alphanumerics, underscore and hyphen up to 64 chars", () => {
    expect(isValidStartPayload("login_abc-123")).toBe(true);
    expect(isValidStartPayload("a".repeat(64))).toBe(true);
  });

  it("rejects empty, too-long or illegal-character payloads", () => {
    expect(isValidStartPayload("")).toBe(false);
    expect(isValidStartPayload("a".repeat(65))).toBe(false);
    expect(isValidStartPayload("has space")).toBe(false);
    expect(isValidStartPayload("emoji😀")).toBe(false);
  });
});
