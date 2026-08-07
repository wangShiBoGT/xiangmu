/**
 * 安全工具 - 加密、签名验证
 */

import CryptoJS from 'crypto-js';
import type { Env, ErrorResponse } from './types';

/**
 * 解密 API Key（AES）
 */
export function decryptApiKey(encryptedKey: string, secret: string): string {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedKey, secret);
    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);

    if (!plaintext) {
      throw new Error('Decryption failed');
    }

    return plaintext;
  } catch (error) {
    throw new Error('Invalid encrypted API key');
  }
}

/**
 * 验证 HMAC 签名
 */
export function verifyHmacSignature(
  timestamp: string,
  body: string,
  signature: string,
  secret: string
): { valid: boolean; error?: ErrorResponse } {
  // 1. 验证时间戳（5 分钟内有效）
  const now = Date.now();
  const requestTime = parseInt(timestamp, 10);

  if (isNaN(requestTime)) {
    return {
      valid: false,
      error: {
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Invalid timestamp format'
        }
      }
    };
  }

  if (now - requestTime > 5 * 60 * 1000) {
    return {
      valid: false,
      error: {
        success: false,
        error: {
          code: 'EXPIRED',
          message: 'Request expired (timestamp too old)'
        }
      }
    };
  }

  // 2. 验证签名
  const expectedSignature = CryptoJS.HmacSHA256(
    `${timestamp}:${body}`,
    secret
  ).toString();

  if (signature !== expectedSignature) {
    return {
      valid: false,
      error: {
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'HMAC signature verification failed'
        }
      }
    };
  }

  return { valid: true };
}

/**
 * 生成缓存 Key
 */
export function generateCacheKey(prefix: string, data: any): string {
  const hash = CryptoJS.SHA256(JSON.stringify(data)).toString();
  return `${prefix}:${hash}`;
}

/**
 * 生成用户 ID（从 IP 或其他标识）
 */
export function generateUserId(request: Request): string {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  return CryptoJS.SHA256(ip).toString().substring(0, 16);
}
