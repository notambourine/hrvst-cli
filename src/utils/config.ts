import fs from "fs";
import ospath from "ospath";
import path from "path";

export interface Config {
  accessToken: string;
  accountId: string;
  accountConfig: Record<string, AccountConfig>;
}

export interface AccountConfig {
  aliases: Record<string, Alias>;
}

export interface Alias {
  projectId: number;
  taskId: number;
}

export class ConfigNotFoundError extends Error {}

export async function getConfig(): Promise<Config> {
  try {
    const config = await fs.promises.readFile(await configPath(), "utf-8");
    return JSON.parse(config);
  } catch (error) {
    throw new ConfigNotFoundError();
  }
}

export async function saveConfig(config: Partial<Config>): Promise<void> {
  const filePath = await configPath();
  let merged: Partial<Config>;
  try {
    merged = Object.assign({}, await getConfig(), config);
  } catch {
    merged = config;
  }
  await fs.promises.writeFile(filePath, JSON.stringify(merged), {
    mode: 0o600,
  });
  await fs.promises.chmod(filePath, 0o600);
}

async function configPath(): Promise<string> {
  const dir = path.join(ospath.home(), ".hrvst");
  await fs.promises.mkdir(dir, { recursive: true, mode: 0o700 });
  return path.join(dir, "config.json");
}
