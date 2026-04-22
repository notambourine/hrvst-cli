import chalk from "chalk";
import open from "open";
import http from "http";
import crypto from "crypto";
import { URLSearchParams } from "url";
import { saveConfig } from "../utils/config";

const BASE_URL = "https://id.getharvest.com";
const CLIENT_ID = "xqrh-rWpCecJlp9L-i0dwu_K";
export const PORT = 5006;

export const command = "login";
export const description = "Log into Harvest";
export const builder = {};

const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

const page = (heading: string, body: string) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>hrvst-cli</title>
  </head>
  <body style="background: #eee; font-family: Arial, Helvetica, sans-serif">
    <main style="display: flex; justify-content: center; margin: 80px auto;">
      <div style="background: #fff; border: 1px solid rgba(0, 0, 0, 0.2); border-radius: 6px; box-shadow: 0 2px 10px rgb(0 0 0 / 10%); padding: 1em 2em; text-align: center;">
        <h1 style="font-weight: 600; margin: 0.25em 0">${heading}</h1>
        <p>${body}</p>
      </div>
    </main>
  </body>
</html>`;

const SUCCESS_HTML = page(
  "hrvst-cli",
  "You may now close this window and return to the CLI.",
);
const ERROR_HTML = page(
  "hrvst-cli — login failed",
  "Authentication was not completed. Return to the CLI for details.",
);

export interface LoginOptions {
  port?: number;
}

export const handler = async (
  opts: LoginOptions = {},
): Promise<http.Server> => {
  const state = crypto.randomBytes(16).toString("hex");

  const server = http
    .createServer(async (req, res) => {
      const queryString = req.url?.split("?")[1] || "";
      const params = new URLSearchParams(queryString);
      let responseHtml = SUCCESS_HTML;

      const error = params.get("error");
      if (error) {
        console.error(chalk.red("Authentication error."));
        responseHtml = ERROR_HTML;
      } else if (params.get("state") !== state) {
        console.error(chalk.red("Invalid state parameter. Login aborted."));
        responseHtml = ERROR_HTML;
      } else {
        const accessToken = params.get("access_token");
        const scope = params.get("scope");

        if (accessToken && scope?.match(/^harvest:\d+$/)) {
          await saveConfig({
            accessToken,
            accountId: scope.split(":")[1],
          });
          console.log(
            chalk.green("Success! You are now authenticated with Harvest."),
          );
        } else {
          console.error(
            chalk.red("Error getting access token and account id."),
          );
          responseHtml = ERROR_HTML;
        }
      }

      res.write(responseHtml);
      res.end();

      req.socket.end();
      req.socket.destroy();
      server.close();
    })
    .listen(opts.port ?? PORT, "localhost");

  const timeout = setTimeout(() => {
    server.close();
    console.error(chalk.red("Login timed out. Please try again."));
  }, LOGIN_TIMEOUT_MS);

  server.on("close", () => clearTimeout(timeout));

  await new Promise<void>((resolve) => server.once("listening", resolve));

  open(
    `${BASE_URL}/oauth2/authorize?client_id=${CLIENT_ID}&response_type=token&state=${state}`,
  );

  return server;
};
