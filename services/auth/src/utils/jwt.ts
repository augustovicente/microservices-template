import jwt from 'jsonwebtoken';
import { loadAuthConfig } from '../config';

interface TokenPayload {
  userId: number;
  email: string;
  role: string;
}

export function signAccessToken(payload: TokenPayload): string {
  const config = loadAuthConfig();
  return jwt.sign(payload, config.jwt.accessTokenSecret, {
    expiresIn: config.jwt.accessTokenExpiry as unknown as number,
  });
}

export function signRefreshToken(payload: TokenPayload): string {
  const config = loadAuthConfig();
  return jwt.sign(payload, config.jwt.refreshTokenSecret, {
    expiresIn: config.jwt.refreshTokenExpiry as unknown as number,
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  const config = loadAuthConfig();
  return jwt.verify(token, config.jwt.accessTokenSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  const config = loadAuthConfig();
  return jwt.verify(token, config.jwt.refreshTokenSecret) as TokenPayload;
}
