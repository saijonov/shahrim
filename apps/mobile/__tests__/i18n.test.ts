import i18n from "../src/i18n";

describe("i18n (Uzbek Latin)", () => {
  it("is initialised in Uzbek", () => {
    expect(i18n.language).toBe("uz");
  });

  it("resolves a shared @shahrim/i18n key", () => {
    expect(i18n.t("report_problem")).toBe("Muammo yuborish");
    expect(i18n.t("my_reports")).toBe("Mening murojaatlarim");
  });

  it("resolves a native-only extra key", () => {
    expect(i18n.t("login_with_telegram")).toBe("Telegram orqali kirish");
    expect(i18n.t("tab_home")).toBe("Bosh sahifa");
  });

  it("interpolates the greeting name", () => {
    expect(i18n.t("greeting", { name: "Ali" })).toBe("Assalomu alaykum, Ali!");
  });
});
