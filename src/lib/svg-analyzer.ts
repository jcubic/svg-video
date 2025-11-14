import { readFile } from 'fs/promises';
import { DOMParser } from '@xmldom/xmldom';
import { parseTime, ValidationError } from './utils.js';

export interface SVGDimensions {
  width: number;
  height: number;
}

export interface SVGAnalysis {
  dimensions: SVGDimensions;
  duration: number | null; // in milliseconds, null if unknown
  hasAnimations: boolean;
  hasInfiniteAnimations: boolean;
  loopDuration: number | null; // duration of one loop for infinite animations
}

/**
 * Analyze SVG file to extract dimensions and animation information
 */
export async function analyzeSVG(svgPath: string): Promise<SVGAnalysis> {
  // Read SVG file
  const svgContent = await readFile(svgPath, 'utf-8');

  // Parse SVG
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  const svgElement = doc.documentElement;

  if (!svgElement || svgElement.tagName !== 'svg') {
    throw new ValidationError('Invalid SVG file: no <svg> root element found');
  }

  // Extract dimensions
  const dimensions = extractDimensions(svgElement);

  // Analyze animations
  const animationInfo = analyzeAnimations(svgElement);

  return {
    dimensions,
    duration: animationInfo.duration,
    hasAnimations: animationInfo.hasAnimations,
    hasInfiniteAnimations: animationInfo.hasInfiniteAnimations,
    loopDuration: animationInfo.loopDuration,
  };
}

/**
 * Extract dimensions from SVG element
 */
function extractDimensions(svgElement: Element): SVGDimensions {
  // Try to get width and height attributes
  const widthAttr = svgElement.getAttribute('width');
  const heightAttr = svgElement.getAttribute('height');

  let width: number | null = null;
  let height: number | null = null;

  if (widthAttr) {
    width = parseNumericAttribute(widthAttr);
  }

  if (heightAttr) {
    height = parseNumericAttribute(heightAttr);
  }

  // If width/height not found, try viewBox
  if (width === null || height === null) {
    const viewBox = svgElement.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.trim().split(/\s+/);
      if (parts.length === 4) {
        width = parseFloat(parts[2]);
        height = parseFloat(parts[3]);
      }
    }
  }

  if (width === null || height === null || width <= 0 || height <= 0) {
    throw new ValidationError(
      'Unable to extract valid dimensions from SVG (no width/height attributes or viewBox)'
    );
  }

  return { width, height };
}

/**
 * Parse numeric attribute (e.g., "100", "100px", "100pt")
 */
function parseNumericAttribute(value: string): number | null {
  // Remove units (px, pt, em, etc.) and parse as float
  const match = value.match(/^([\d.]+)/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  return isNaN(num) ? null : num;
}

/**
 * Analyze SMIL animations in the SVG
 */
function analyzeAnimations(svgElement: Element): {
  hasAnimations: boolean;
  duration: number | null;
  hasInfiniteAnimations: boolean;
  loopDuration: number | null;
} {
  const animationTags = [
    'animate',
    'animateTransform',
    'animateMotion',
    'set',
    'animateColor',
  ];

  let maxEndTime = 0;
  let hasAnimations = false;
  let hasInfiniteAnimations = false;
  const loopDurations: number[] = [];
  const infiniteLoopDurations: number[] = []; // durations from repeatCount="indefinite"

  // Find all animation elements
  for (const tagName of animationTags) {
    const elements = svgElement.getElementsByTagName(tagName);

    for (let i = 0; i < elements.length; i++) {
      const animElement = elements[i];
      hasAnimations = true;

      // Parse animation timing
      const timing = parseAnimationTiming(animElement);

      if (timing.isInfinite) {
        hasInfiniteAnimations = true;
        // Collect base duration for loop detection
        if (timing.baseDuration !== null && timing.baseDuration > 0) {
          loopDurations.push(timing.baseDuration);
          // If it's explicitly infinite (repeatCount="indefinite"), prioritize it
          if (timing.isExplicitInfinite) {
            infiniteLoopDurations.push(timing.baseDuration);
          }
        }
      } else if (timing.endTime !== null) {
        maxEndTime = Math.max(maxEndTime, timing.endTime);
      }
    }
  }

  // Calculate loop duration for infinite animations
  let loopDuration: number | null = null;
  if (hasInfiniteAnimations && loopDurations.length > 0) {
    // Prioritize animations with explicit repeatCount="indefinite"
    if (infiniteLoopDurations.length > 0) {
      // Find the smallest reasonable loop from explicit infinite animations
      // Filter out extremely long durations (those are likely placeholder values)
      const reasonableLoops = infiniteLoopDurations.filter(d => d <= 600 * 1000); // <= 10 minutes
      if (reasonableLoops.length > 0) {
        // Use the maximum of the reasonable durations for a complete loop
        loopDuration = Math.max(...reasonableLoops);
      } else {
        // All are too long, just use the minimum
        loopDuration = Math.min(...infiniteLoopDurations);
      }
    } else {
      // No explicit infinite loops, use heuristic from all infinite animations
      loopDuration = Math.max(...loopDurations);
    }
  }

  return {
    hasAnimations,
    duration: hasAnimations && !hasInfiniteAnimations && maxEndTime > 0 ? maxEndTime : null,
    hasInfiniteAnimations,
    loopDuration,
  };
}

/**
 * Parse animation timing attributes
 */
function parseAnimationTiming(element: Element): {
  endTime: number | null;
  isInfinite: boolean;
  baseDuration: number | null; // The duration of one loop iteration
  isExplicitInfinite: boolean; // True if repeatCount="indefinite" is explicitly set
} {
  const durAttr = element.getAttribute('dur');
  const beginAttr = element.getAttribute('begin') || '0s';
  const repeatCountAttr = element.getAttribute('repeatCount');
  const repeatDurAttr = element.getAttribute('repeatDur');

  // Check for indefinite duration
  if (durAttr === 'indefinite') {
    return { endTime: null, isInfinite: true, baseDuration: null, isExplicitInfinite: false };
  }

  // Parse base duration
  let baseDuration = 0;
  if (durAttr) {
    const parsedDur = parseTime(durAttr);
    if (parsedDur !== null) {
      baseDuration = parsedDur;
    }
  }

  // Check for indefinite repeat - this is the key indicator of a loop animation
  if (repeatCountAttr === 'indefinite') {
    // This is an infinite loop with a known base duration
    return { endTime: null, isInfinite: true, baseDuration, isExplicitInfinite: true };
  }

  if (repeatDurAttr === 'indefinite') {
    return { endTime: null, isInfinite: true, baseDuration, isExplicitInfinite: true };
  }

  // Parse begin time
  let beginTime = 0;
  const parsedBegin = parseTime(beginAttr);
  if (parsedBegin !== null) {
    beginTime = parsedBegin;
  }

  // Parse repeat count
  let repeatCount = 1;
  if (repeatCountAttr && repeatCountAttr !== 'indefinite') {
    const parsed = parseFloat(repeatCountAttr);
    if (!isNaN(parsed) && parsed > 0) {
      repeatCount = parsed;
    }
  }

  // Parse repeat duration
  let repeatDuration: number | null = null;
  if (repeatDurAttr && repeatDurAttr !== 'indefinite') {
    repeatDuration = parseTime(repeatDurAttr);
  }

  // Calculate total duration
  let totalDuration: number;
  if (repeatDuration !== null) {
    totalDuration = repeatDuration;
  } else {
    totalDuration = baseDuration * repeatCount;
  }

  // Check for extremely long durations (treat as infinite loop)
  const MAX_REASONABLE_DURATION = 3600 * 1000; // 1 hour
  if (totalDuration > MAX_REASONABLE_DURATION) {
    // It's effectively infinite, but we know the base loop duration
    return { endTime: null, isInfinite: true, baseDuration, isExplicitInfinite: false };
  }

  const endTime = beginTime + totalDuration;

  return { endTime, isInfinite: false, baseDuration, isExplicitInfinite: false };
}
