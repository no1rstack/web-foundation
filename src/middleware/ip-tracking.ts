import type { IpTrackingConfig, RequestMetadata, GeoResult } from '../types.js';
import crypto from 'crypto';

export function extractClientIp(
  headers: Record<string, string | string[] | undefined>,
  remoteAddress?: string
): string | null {
  const forwarded = headers['x-forwarded-for'];

  let forwardedValue: string | undefined;
  if (Array.isArray(forwarded)) {
    forwardedValue = forwarded[0];
  } else {
    forwardedValue = forwarded;
  }

  const firstForwardedIp = forwardedValue?.split(',')[0]?.trim();
  const fallbackIp = remoteAddress || null;
  const rawIp = firstForwardedIp || fallbackIp;

  if (!rawIp) return null;
  return rawIp.replace('::ffff:', '');
}

export function hashIp(ip: string, salt?: string): string {
  const effectiveSalt = salt || 'web-foundation-ip-salt';
  return crypto.createHash('sha256').update(`${effectiveSalt}:${ip}`).digest('hex');
}

export function shouldSkipIpTracking(path: string, skipPaths: string[] = []): boolean {
  const defaultSkip = ['/health', '/assets/', '/@vite/', '/@fs/', '/@id/'];
  const staticExtensions = new Set([
    '.css', '.js', '.map', '.png', '.jpg', '.jpeg', '.svg', '.gif',
    '.ico', '.woff', '.woff2', '.ttf', '.eot', '.webp', '.avif',
  ]);

  const allSkip = [...defaultSkip, ...skipPaths];
  for (const skip of allSkip) {
    if (path.startsWith(skip)) return true;
  }

  const ext = path.substring(path.lastIndexOf('.'));
  if (staticExtensions.has(ext)) return true;

  return false;
}

export function detectBot(userAgent?: string): {
  isBot: boolean;
  botName?: string;
  botScore: number;
} {
  if (!userAgent) return { isBot: false, botScore: 0 };

  const ua = userAgent.toLowerCase();

  const knownBots: Record<string, string> = {
    'googlebot': 'google',
    'google-inspectiontool': 'google',
    'bingbot': 'bing',
    'slurp': 'yahoo',
    'duckduckbot': 'duckduckgo',
    'baiduspider': 'baidu',
    'yandexbot': 'yandex',
    'facebot': 'facebook',
    'twitterbot': 'twitter',
    'rogerbot': 'moz',
    'linkedinbot': 'linkedin',
    'embedly': 'embedly',
    'quora link preview': 'quora',
    'showyoubot': 'showyou',
    'outbrain': 'outbrain',
    'pinterestbot': 'pinterest',
    'slackbot': 'slack',
    'discordbot': 'discord',
    'whatsapp': 'whatsapp',
    'telegrambot': 'telegram',
    'applebot': 'apple',
    'petalbot': 'huawei',
    'ahrefsbot': 'ahrefs',
    'semrushbot': 'semrush',
    'dotbot': 'moz',
    'mj12bot': 'majestic',
    'brandwatch': 'brandwatch',
  };

  for (const [identifier, name] of Object.entries(knownBots)) {
    if (ua.includes(identifier)) {
      return { isBot: true, botName: name, botScore: 100 };
    }
  }

  const botIndicators = ['bot', 'crawler', 'spider', 'scraper', 'headless', 'phantom', 'selenium'];
  const score = botIndicators.filter((i) => ua.includes(i)).length * 20;

  return { isBot: score > 0, botScore: score };
}

export async function detectVpn(
  ip: string
): Promise<{ isVpn: boolean; isProxy: boolean; isHosting: boolean; score: number }> {
  return { isVpn: false, isProxy: false, isHosting: false, score: 0 };
}

export function createRequestMetadata(
  ip: string | null,
  config: IpTrackingConfig,
  userAgent?: string,
  referer?: string
): RequestMetadata {
  const metadata: RequestMetadata = {
    ip: config.storeRawIp ? (ip ?? undefined) : undefined,
    ipHash: ip ? hashIp(ip, config.hashSalt) : undefined,
    userAgent,
    referer,
  };

  if (ip && config.botScoring) {
    const bot = detectBot(userAgent);
    metadata.botScore = bot.botScore;
  }

  return metadata;
}
