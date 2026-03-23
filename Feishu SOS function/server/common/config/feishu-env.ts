import { ConfigService } from '@nestjs/config';

type RequiredEnvKey = 'FEISHU_APP_ID' | 'FEISHU_APP_SECRET';

export function getRequiredEnv(
  configService: ConfigService,
  key: RequiredEnvKey,
): string {
  const value = configService.get<string>(key)?.trim();

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. Set ${key} before starting the server.`,
    );
  }

  return value;
}

export function getFeishuEnvConfig(configService: ConfigService): {
  appId: string;
  appSecret: string;
} {
  return {
    appId: getRequiredEnv(configService, 'FEISHU_APP_ID'),
    appSecret: getRequiredEnv(configService, 'FEISHU_APP_SECRET'),
  };
}
