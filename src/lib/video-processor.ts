import ffmpeg from 'fluent-ffmpeg';
import { ProcessingError, SystemError } from './utils.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Check if FFmpeg is installed
 */
export async function checkFFmpeg(): Promise<void> {
  try {
    await execAsync('ffmpeg -version');
  } catch (error) {
    throw new SystemError(
      'FFmpeg is not installed. Please install FFmpeg to use this tool.\n' +
      'Visit https://ffmpeg.org/download.html for installation instructions.'
    );
  }
}

export interface ProcessorOptions {
  width: number;
  height: number;
}

/**
 * Process video: convert WebM to MP4 and crop to exact dimensions
 */
export async function processVideo(
  inputPath: string,
  outputPath: string,
  options: ProcessorOptions
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',        // H.264 codec
        '-preset medium',       // Encoding speed/quality balance
        '-crf 23',             // Quality (lower = better, 18-28 is good range)
        '-pix_fmt yuv420p',    // Pixel format for compatibility
        '-movflags +faststart', // Enable fast start for web playback
      ])
      .videoFilters([
        `scale=${options.width}:${options.height}:force_original_aspect_ratio=decrease`,
        `pad=${options.width}:${options.height}:(ow-iw)/2:(oh-ih)/2`,
      ])
      .output(outputPath)
      .on('start', (commandLine) => {
        // Message is printed from main CLI
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          process.stdout.write(`\rConversion progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log('\nConversion complete!');
        resolve();
      })
      .on('error', (error) => {
        reject(
          new ProcessingError(
            `Failed to process video: ${error.message}`
          )
        );
      })
      .run();
  });
}
