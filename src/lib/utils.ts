import { access, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { constants } from 'fs';

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse time string (e.g., "1s", "1000ms", "1.5s") to milliseconds
 */
export function parseTime(timeStr: string): number | null {
  const match = timeStr.match(/^([\d.]+)(ms|s)$/i);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === 'ms') {
    return value;
  } else if (unit === 's') {
    return value * 1000;
  }

  return null;
}

/**
 * Generate a temporary file path
 */
export function getTempFilePath(extension: string): string {
  const randomStr = Math.random().toString(36).substring(2, 15);
  return join(tmpdir(), `svg-video-${randomStr}.${extension}`);
}

/**
 * Delete a file if it exists
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error: any) {
    // Ignore if file doesn't exist
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Validate that a number is positive
 */
export function validatePositiveNumber(value: any, name: string): number {
  const num = Number(value);
  if (isNaN(num) || num <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return num;
}

/**
 * Error types for better error handling
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProcessingError';
  }
}

export class SystemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SystemError';
  }
}
