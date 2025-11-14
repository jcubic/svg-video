import puppeteer, { Browser, Page } from 'puppeteer';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import { ProcessingError } from './utils.js';

export interface RecorderOptions {
  width: number;
  height: number;
  duration: number; // in milliseconds
  fps?: number;
}

/**
 * Record SVG animation using Puppeteer
 */
export async function recordAnimation(
  htmlPath: string,
  outputPath: string,
  options: RecorderOptions,
  onProgress?: (progress: number) => void
): Promise<void> {
  let browser: Browser | null = null;
  let page: Page | null = null;
  let recorder: PuppeteerScreenRecorder | null = null;

  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    page = await browser.newPage();

    // Set viewport size
    await page.setViewport({
      width: options.width,
      height: options.height,
      deviceScaleFactor: 1,
    });

    // Initialize recorder
    recorder = new PuppeteerScreenRecorder(page, {
      fps: options.fps || 30,
      videoBitrate: 5000,
      videoFrame: {
        width: options.width,
        height: options.height,
      },
    });

    // Navigate to HTML page
    await page.goto(`file://${htmlPath}`, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Wait for image to load
    await page.waitForSelector('img', { timeout: 10000 });
    
    // Give extra time for SVG to fully initialize
    await page.waitForTimeout(500);

    // Start recording
    await recorder.start(outputPath);

    // Wait for animation duration with progress updates
    const duration = options.duration;
    const updateInterval = 1000; // Update every second
    let elapsed = 0;

    while (elapsed < duration) {
      const waitTime = Math.min(updateInterval, duration - elapsed);
      await page.waitForTimeout(waitTime);
      elapsed += waitTime;

      // Report progress
      if (onProgress) {
        const progress = Math.min(100, Math.round((elapsed / duration) * 100));
        onProgress(progress);
      }
    }

    // Stop recording
    await recorder.stop();
  } catch (error: any) {
    throw new ProcessingError(
      `Failed to record animation: ${error.message}`
    );
  } finally {
    // Cleanup
    if (recorder) {
      try {
        await recorder.stop();
      } catch {
        // Ignore errors during cleanup
      }
    }

    if (page) {
      try {
        await page.close();
      } catch {
        // Ignore errors during cleanup
      }
    }

    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore errors during cleanup
      }
    }
  }
}
