/**
 * lib/utils.ts
 * Shared utility helpers used across the application.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS class names, resolving conflicts intelligently.
 * Requires: npm install clsx tailwind-merge
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Generates a simple UUID-like unique ID string.
 * Uses crypto.randomUUID() when available, with a fallback.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Formats a duration from seconds into a human-readable string.
 * @example formatDuration(90) → "1m 30s"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

/**
 * Formats a percentage number to one decimal place.
 * @example formatPercentage(87.5) → "87.5%"
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Returns a colour token based on a percentage score for visual feedback.
 * These correspond to Tailwind CSS class suffixes.
 */
export function getScoreColour(percentage: number): 'green' | 'yellow' | 'red' {
  if (percentage >= 70) return 'green';
  if (percentage >= 40) return 'yellow';
  return 'red';
}

/**
 * Shuffles an array in-place using the Fisher-Yates algorithm.
 * Returns the same array reference for convenience.
 */
export function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Converts an ISO timestamp string to a locale-friendly date string.
 * @example formatDate("2024-01-15T...")  → "Jan 15, 2024"
 */
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
