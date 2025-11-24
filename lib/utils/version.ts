/**
 * Version utility functions for document version control
 * Handles both Prototype (vA, vB, vC) and Production (v1, v2, v3) versioning
 */

export type VersionType = 'prototype' | 'production';

export interface ParsedVersion {
  type: VersionType;
  number: number;
  raw: string;
}

/**
 * Parse a version string into its components
 * Examples:
 *   "vA" -> { type: 'prototype', number: 1, raw: 'vA' }
 *   "vC" -> { type: 'prototype', number: 3, raw: 'vC' }
 *   "v1" -> { type: 'production', number: 1, raw: 'v1' }
 *   "v10" -> { type: 'production', number: 10, raw: 'v10' }
 */
export function parseVersion(version: string): ParsedVersion | null {
  if (!version || !version.startsWith('v')) {
    return null;
  }

  const suffix = version.substring(1); // Remove 'v' prefix

  // Check if it's a letter (prototype)
  if (suffix.length === 1 && /^[A-Z]$/.test(suffix)) {
    const number = suffix.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
    return {
      type: 'prototype',
      number,
      raw: version,
    };
  }

  // Check if it's a number (production)
  if (/^\d+$/.test(suffix)) {
    return {
      type: 'production',
      number: parseInt(suffix, 10),
      raw: version,
    };
  }

  return null;
}

/**
 * Get the next version string
 * Examples:
 *   getNextVersion("vA", false) -> "vB"
 *   getNextVersion("vZ", false) -> throws error
 *   getNextVersion("v1", true) -> "v2"
 *   getNextVersion("v999", true) -> throws error
 */
export function getNextVersion(currentVersion: string, isProduction: boolean): string {
  const parsed = parseVersion(currentVersion);

  if (!parsed) {
    throw new Error(`Invalid version format: ${currentVersion}`);
  }

  // Verify version type matches production flag
  if (isProduction && parsed.type !== 'production') {
    throw new Error(`Version ${currentVersion} is not a production version`);
  }

  if (!isProduction && parsed.type !== 'prototype') {
    throw new Error(`Version ${currentVersion} is not a prototype version`);
  }

  if (isProduction) {
    // Production: v1 -> v2 -> v3
    if (parsed.number >= 999) {
      throw new Error('Production version limit reached (v999)');
    }
    return `v${parsed.number + 1}`;
  } else {
    // Prototype: vA -> vB -> vC
    if (parsed.number >= 26) {
      throw new Error('Prototype version limit reached (vZ)');
    }
    const nextLetter = String.fromCharCode('A'.charCodeAt(0) + parsed.number);
    return `v${nextLetter}`;
  }
}

/**
 * Compare two versions
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 * Throws error if comparing different types
 */
export function compareVersions(v1: string, v2: string): number {
  const parsed1 = parseVersion(v1);
  const parsed2 = parseVersion(v2);

  if (!parsed1 || !parsed2) {
    throw new Error('Invalid version format for comparison');
  }

  if (parsed1.type !== parsed2.type) {
    throw new Error('Cannot compare prototype and production versions');
  }

  if (parsed1.number < parsed2.number) return -1;
  if (parsed1.number > parsed2.number) return 1;
  return 0;
}

/**
 * Get all versions between start and end (inclusive)
 * Examples:
 *   getVersionRange("vA", "vC") -> ["vA", "vB", "vC"]
 *   getVersionRange("v1", "v3") -> ["v1", "v2", "v3"]
 */
export function getVersionRange(startVersion: string, endVersion: string): string[] {
  const start = parseVersion(startVersion);
  const end = parseVersion(endVersion);

  if (!start || !end) {
    throw new Error('Invalid version format');
  }

  if (start.type !== end.type) {
    throw new Error('Cannot create range between different version types');
  }

  if (start.number > end.number) {
    throw new Error('Start version must be less than or equal to end version');
  }

  const versions: string[] = [];

  if (start.type === 'production') {
    for (let i = start.number; i <= end.number; i++) {
      versions.push(`v${i}`);
    }
  } else {
    for (let i = start.number; i <= end.number; i++) {
      const letter = String.fromCharCode('A'.charCodeAt(0) + i - 1);
      versions.push(`v${letter}`);
    }
  }

  return versions;
}

/**
 * Get the initial version for a new document
 */
export function getInitialVersion(isProduction: boolean): string {
  return isProduction ? 'v1' : 'vA';
}

/**
 * Validate a version string format
 */
export function isValidVersion(version: string): boolean {
  return parseVersion(version) !== null;
}
