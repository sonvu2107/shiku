import { jest } from "@jest/globals";

describe("client token manager", () => {
  beforeEach(() => {
    jest.resetModules();
    delete global.window;
    delete process.env.VITE_ALLOW_LEGACY_LOCALSTORAGE_REFRESH;
  });

  it("keeps access token in memory without touching localStorage", async () => {
    const localStorageMock = {
      setItem: jest.fn(),
      getItem: jest.fn(),
      removeItem: jest.fn()
    };

    global.window = { localStorage: localStorageMock };

    const tokenManager = await import("../../client/src/utils/tokenManager.js");

    tokenManager.saveTokens("access-token-value", "refresh-token-value");

    expect(tokenManager.getAccessToken()).toBe("access-token-value");
    expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
      "refreshToken",
      expect.anything()
    );
  });
});
