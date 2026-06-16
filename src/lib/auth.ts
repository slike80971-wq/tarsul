/**
 * Tarsul — تراسل | Server-Side Auth Utilities
 * Simple password hashing for the Tarsul deployment (PostgreSQL / Supabase).
 * Uses Node.js crypto for SHA-256 + salt hashing.
 */

import { createHash, randomBytes } from 'crypto';

/** Hash a password with a random salt */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256')
    .update(password + salt)
    .digest('hex');
  return { hash, salt };
}

/** Verify a password against a stored hash and salt */
export function verifyPassword(
  password: string,
  storedHash: string,
  salt: string
): boolean {
  const hash = createHash('sha256')
    .update(password + salt)
    .digest('hex');
  return hash === storedHash;
}

/** Generate a secure session token */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}
