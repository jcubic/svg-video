import lily from '@jcubic/lily';
import { resolve } from 'path';
import { analyzeSVG } from './lib/svg-analyzer.js';
import { generateHTMLFile } from './lib/template-generator.js';
import { recordAnimation } from './lib/recorder.js';
import { processVideo, checkFFmpeg } from './lib/video-processor.js';
import {
  version,
  fileExists,
  getTempFilePath,
  deleteFile,
  validatePositiveNumber,
  ValidationError,
  ProcessingError,
  SystemError,
} from './lib/utils.js';

interface CliOptions {
  width?: number;
  height?: number;
  duration?: number;
  fps?: number;
  w?: number;
  h?: number;
  d?: number;
  f?: number;
}

async function main() {
  try {
    // Parse CLI arguments
    const options = lily(process.argv.slice(2), {
      parse_args: true,
    }) as CliOptions & { _: string[] };
    if (options.version) {
      console.error(version());
      process.exit(0);
    } else if (options._.length < 2) {
      console.error('Usage: svg-video <input.svg> <output.mp4> [options]');
      console.error('\nOptions:');
      console.error('  -w, --width <pixels>     Maximum width (default: from SVG)');
      console.error('  -h, --height <pixels>    Maximum height (default: from SVG)');
      console.error('  -d, --duration <seconds> Override animation duration');
      console.error('  -f, --fps <number>       Frame rate (default: 30)');
      console.error("  -v, --version            Show version number");
      console.error('\nExamples:');
      console.error('  svg-video input.svg output.mp4');
      console.error('  svg-video input.svg output.mp4 --width 1920 --height 1080');
      console.error('  svg-video input.svg output.mp4 -d 10');
      process.exit(0);
    }

    // Extract positional arguments (input and output)
    const inputPath = resolve(options._[0]);
    const outputPath = resolve(options._[1]);

    // Normalize options (handle both long and short forms)
    const width = options.width ?? options.w;
    const height = options.height ?? options.h;
    const duration = options.duration ?? options.d;
    const fps = options.fps ?? options.f ?? 30;

    // Validate input file exists
    if (!(await fileExists(inputPath))) {
      throw new ValidationError(`Input file not found: ${inputPath}`);
    }

    // Check if FFmpeg is installed
    console.log('Checking system dependencies...');
    await checkFFmpeg();

    // Analyze SVG
    console.log('Analyzing SVG...');
    const svgAnalysis = await analyzeSVG(inputPath);
    console.log(
      `SVG dimensions: ${svgAnalysis.dimensions.width}x${svgAnalysis.dimensions.height}`
    );

    // Determine dimensions
    let finalWidth = width || svgAnalysis.dimensions.width;
    let finalHeight = height || svgAnalysis.dimensions.height;

    // Validate dimensions
    finalWidth = validatePositiveNumber(finalWidth, 'Width');
    finalHeight = validatePositiveNumber(finalHeight, 'Height');

    // Determine duration
    let durationMs: number;

    if (duration) {
      // User provided duration
      const durationSeconds = validatePositiveNumber(duration, 'Duration');
      durationMs = durationSeconds * 1000;
      console.log(`Using manual duration: ${durationSeconds}s`);
    } else if (svgAnalysis.hasInfiniteAnimations) {
      // Check if we detected a loop duration
      if (svgAnalysis.loopDuration !== null && svgAnalysis.loopDuration > 0) {
        durationMs = svgAnalysis.loopDuration;
        console.log(
          `Detected infinite animation with loop duration: ${(durationMs / 1000).toFixed(2)}s`
        );
        console.log('Recording one complete loop...');
      } else {
        throw new ValidationError(
          'SVG contains infinite animations without detectable loop duration. Please specify duration with --duration option.'
        );
      }
    } else if (!svgAnalysis.hasAnimations) {
      throw new ValidationError(
        'No animations detected in SVG. Please specify duration with --duration option.'
      );
    } else if (svgAnalysis.duration === null) {
      throw new ValidationError(
        'Unable to determine animation duration. Please specify duration with --duration option.'
      );
    } else {
      durationMs = svgAnalysis.duration;
      console.log(
        `Detected animation duration: ${(durationMs / 1000).toFixed(2)}s`
      );
    }

    // Validate FPS
    const finalFps = validatePositiveNumber(fps, 'FPS');

    // Generate temporary HTML file
    console.log('Generating HTML...');
    const tempHtmlPath = getTempFilePath('html');
    await generateHTMLFile(
      {
        svgPath: inputPath,
        width: finalWidth,
        height: finalHeight,
      },
      tempHtmlPath
    );

    // Record animation
    const durationSeconds = durationMs / 1000;
    const estimatedMinutes = Math.floor(durationSeconds / 60);
    const estimatedSeconds = Math.round(durationSeconds % 60);
    
    let timeEstimate = '';
    if (estimatedMinutes > 0) {
      timeEstimate = `${estimatedMinutes}m ${estimatedSeconds}s`;
    } else {
      timeEstimate = `${estimatedSeconds}s`;
    }
    
    console.log(`Recording animation (${durationSeconds.toFixed(1)}s duration, estimated time: ~${timeEstimate})...`);
    
    const tempVideoPath = getTempFilePath('webm');
    
    // Track progress
    let lastProgress = 0;
    await recordAnimation(tempHtmlPath, tempVideoPath, {
      width: finalWidth,
      height: finalHeight,
      duration: durationMs,
      fps: finalFps,
    }, (progress) => {
      // Update progress every 10%
      if (progress >= lastProgress + 10 || progress === 100) {
        process.stdout.write(`\rRecording progress: ${progress}%`);
        lastProgress = progress;
      }
    });
    
    console.log('\nRecording complete!');

    // Process video (convert to MP4)
    console.log('Converting to MP4...');
    await processVideo(tempVideoPath, outputPath, {
      width: finalWidth,
      height: finalHeight,
    });

    // Cleanup temporary files
    console.log('Cleaning up...');
    await deleteFile(tempHtmlPath);
    await deleteFile(tempVideoPath);

    console.log(`\nSuccess! Video saved to: ${outputPath}`);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      console.error(`\nValidation Error: ${error.message}`);
      process.exit(1);
    } else if (error instanceof ProcessingError) {
      console.error(`\nProcessing Error: ${error.message}`);
      process.exit(2);
    } else if (error instanceof SystemError) {
      console.error(`\nSystem Error: ${error.message}`);
      process.exit(3);
    } else {
      console.error(`\nUnexpected Error: ${error.message}`);
      console.error(error.stack);
      process.exit(99);
    }
  }
}

main();
