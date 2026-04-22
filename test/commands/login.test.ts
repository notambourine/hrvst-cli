import chalk from "chalk";
import type { AddressInfo } from "net";
import open from "open";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handler } from "../../src/commands/login";
import { saveConfig } from "../../src/utils/config";

vi.mock("open");
vi.mock("../../src/utils/config");

describe("login", () => {
  let activeServer: Awaited<ReturnType<typeof handler>> | undefined;

  afterEach(async () => {
    vi.clearAllMocks();
    if (activeServer?.listening) {
      await new Promise<void>((resolve) =>
        activeServer!.close(() => resolve()),
      );
    }
    activeServer = undefined;
  });

  const startServer = async () => {
    activeServer = await handler({ port: 0 });
    const { port } = activeServer.address() as AddressInfo;
    return request(`http://localhost:${port}`);
  };

  const capturedOpenUrl = () => vi.mocked(open).mock.calls[0][0] as string;

  it("should save access token and config", async () => {
    const accessToken = "test_token";
    const accountId = "1576721";
    const scope = `harvest:${accountId}`;

    const oauthServer = await startServer();

    expect(open).toHaveBeenCalledTimes(1);
    const openUrl = capturedOpenUrl();
    expect(openUrl).toMatch(
      /^https:\/\/id\.getharvest\.com\/oauth2\/authorize\?client_id=xqrh-rWpCecJlp9L-i0dwu_K&response_type=token&state=[a-f0-9]{32}$/,
    );
    const state = new URL(openUrl).searchParams.get("state");

    await oauthServer.get(
      `?access_token=${accessToken}&expires_in=1209599&scope=${scope}&state=${state}&token_type=bearer`,
    );

    expect(saveConfig).toHaveBeenCalledTimes(1);
    expect(saveConfig).toHaveBeenCalledWith({ accessToken, accountId });
  });

  it("should output error", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error");
    const error = "access_denied";

    const oauthServer = await startServer();

    expect(open).toHaveBeenCalledTimes(1);

    await oauthServer.get(`?error=${error}`);

    expect(saveConfig).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      chalk.red("Authentication error."),
    );
  });

  it("should reject a mismatched state", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error");

    const oauthServer = await startServer();

    await oauthServer.get(
      `?access_token=x&scope=harvest:1&state=wrong-state&token_type=bearer`,
    );

    expect(saveConfig).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      chalk.red("Invalid state parameter. Login aborted."),
    );
  });
});
