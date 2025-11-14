# SVG to MP4 Converter - Implementation Plan

## Project Overview
Create an NPM binary tool that converts SVG animations to MP4 video files using Puppeteer for recording and FFmpeg for video processing.

## Supported Animation Types
- **Phase 1**: SMIL animations (SVG `<animate>`, `<animateTransform>`, `<set>` elements)
  - ✅ **Implemented**: Automatic loop detection for `repeatCount="indefinite"` animations
  - Detects base loop duration from `dur` attribute
  - Filters out placeholder/extremely long durations
  - Records one complete seamless loop automatically
- **Future**: CSS animations and JavaScript-based animations (can be recorded with manual duration parameter)

## Technology Stack
- **Node.js**: Runtime environment (minimum version: 22.x LTS)
- **TypeScript**: Type-safe development
- **Vite**: Build tool (library mode for bundling TypeScript source only)
- **ts-node**: TypeScript execution for development/testing
- **Puppeteer**: Headless browser automation for rendering SVG
- **puppeteer-screen-recorder**: Screen recording capability
- **@jcubic/lily**: Command-line argument parser
- **fluent-ffmpeg** (or similar): FFmpeg wrapper for video cropping/processing
- **Handlebars**: HTML template engine

## Development & Build Setup

### TypeScript Configuration
- Source code location: `./src/`
- Build output: `./bin/index.js` (with shebang `#!/usr/bin/env node`)
- Target: ES2022 (Node.js 22 LTS compatible)
- Module system: ESM (ES Modules)
- No `.d.ts` generation (CLI tool only, not a library)

### Build Process
- **Vite Library Mode**: Bundle only TypeScript source code from `./src/`
- **Dependencies**: Remain in `node_modules/` (not bundled, resolved at runtime)
- **Output**: Single executable file at `./bin/index.js`

### Development Workflow
```bash
# Manual testing during development (run directly from ./src)
npx ts-node src/index.ts animation.svg output.mp4

# Run automated tests (Vitest)
npm test

# Build for production
npm run build
```

### Scripts Configuration
```json
{
  "scripts": {
    "build": "vite build",
    "test": "vitest"
  }
}
```

## Command Line Interface

### Usage
```bash
svg-video input.svg output.mp4 [options]
svg-video [options] input.svg output.mp4
```

### Options
- `-w, --width <pixels>`: Maximum width of the output video (default: from SVG)
- `-h, --height <pixels>`: Maximum height of the output video (default: from SVG)
- `-d, --duration <seconds>`: Override animation duration (for JS animations or manual control)
- `-f, --fps <number>`: Frame rate (default: 30)
- Input/output files can be specified before or after options (lily handles both)

### Examples
```bash
svg-video input.svg output.mp4
svg-video input.svg output.mp4 --width 1920 --height 1080
svg-video -w 1280 -h 720 input.svg output.mp4
svg-video input.svg output.mp4 -d 10
```

## Core Components

### 1. CLI Entry Point (`src/index.ts`)
- Parse arguments using `@jcubic/lily`
- Validate input/output file paths
- Validate and set default options
- Orchestrate the conversion workflow
- Handle errors and provide user feedback

### 2. SVG Parser/Analyzer (`src/lib/svg-analyzer.ts`)
- Read and parse SVG file
- Extract SVG dimensions from attributes or viewBox
- Detect animation elements (SMIL: `<animate>`, `<animateTransform>`, `<set>`, etc.)
- Calculate total animation duration:
  - Parse `dur` attribute (support time formats: `1s`, `1000ms`, `1.5s`)
  - Parse `begin` attribute for delayed starts
  - Parse `repeatCount` and `repeatDur` for repeating animations
  - Return the longest animation end time
- Handle edge cases:
  - No animations detected (skip or error)
  - Invalid SVG format (error)
  - Missing duration attributes (skip or use manual duration)
  - Infinite animations (`repeatCount="indefinite"` - use manual duration or error)

### 3. HTML Template Generator (`src/lib/template-generator.ts`)
- Create Handlebars template with:
  - HTML5 doctype
  - Responsive viewport meta tag
  - CSS styling for container dimensions
  - CSS to prevent overflow (`max-width`, `max-height`)
  - SVG embedded as `<img src="file://path/to/svg.svg">`
- Template parameters:
  - `svgPath`: Path to the SVG file
  - `width`: Container width
  - `height`: Container height
- Example template structure:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      margin: 0;
      padding: 0;
      width: {{width}}px;
      height: {{height}}px;
      overflow: hidden;
    }
    img {
      max-width: {{width}}px;
      max-height: {{height}}px;
      display: block;
    }
  </style>
</head>
<body>
  <img src="{{svgPath}}" />
</body>
</html>
```

### 4. Video Recorder (`src/lib/recorder.ts`)
- Initialize Puppeteer browser with appropriate viewport
- Set viewport size based on width/height parameters
- Load generated HTML page
- Wait for SVG to load
- Initialize puppeteer-screen-recorder
- Record for the calculated/specified duration
- Save raw video file
- Close browser
- Configuration:
  - Video format: WebM (puppeteer-screen-recorder native format)
  - Frame rate: from CLI options (default 30fps)
  - Video quality settings

### 5. Video Processor (`src/lib/video-processor.ts`)
- Use fluent-ffmpeg to:
  - Crop video to exact SVG dimensions
  - Convert WebM to MP4 (H.264 codec)
  - Set output video parameters:
    - Codec: H.264 (widely supported)
    - Container: MP4
    - Quality: High quality preset
- Handle max-width and max-height constraints
- Calculate final output dimensions (maintain aspect ratio)
- Clean up temporary files

## Workflow

1. **Initialize**
   - Parse CLI arguments
   - Validate input SVG file exists
   - Set default options

2. **Analyze SVG**
   - Parse SVG file
   - Extract dimensions (viewBox or width/height attributes)
   - Detect animations
   - Calculate total duration
   - If no animations and no manual duration: error
   - If infinite animations and no manual duration: error

3. **Prepare Recording**
   - Determine final dimensions (CLI params vs SVG dimensions vs max constraints)
   - Generate HTML from Handlebars template
   - Write temporary HTML file

4. **Record Video**
   - Launch Puppeteer with correct viewport
   - Load HTML page
   - Wait for SVG to load (check img.complete or wait for load event)
   - Start screen recording
   - Wait for duration time
   - Stop recording
   - Save WebM file
   - Close browser

5. **Process Video**
   - Use FFmpeg to:
     - Crop to exact dimensions
     - Convert to MP4 (H.264)
     - Optimize for web playback
   - Save final MP4 file

6. **Cleanup**
   - Remove temporary HTML file
   - Remove temporary WebM file
   - Report success

## Dependencies

### Required NPM Packages
```json
{
  "dependencies": {
    "@jcubic/lily": "^1.x",
    "puppeteer": "^22.x",
    "puppeteer-screen-recorder": "^3.x",
    "fluent-ffmpeg": "^2.x",
    "handlebars": "^4.x",
    "@xmldom/xmldom": "^0.8.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vite": "^5.x",
    "vitest": "^1.x",
    "ts-node": "^10.x",
    "@types/node": "^22.x",
    "@types/fluent-ffmpeg": "^2.x"
  },
  "bin": {
    "svg-video": "./bin/index.js"
  },
  "type": "module"
}
```

### System Dependencies
- FFmpeg must be installed on the system
- Chromium (installed via Puppeteer)

## Error Handling

### User Errors
- Invalid SVG file format
- Missing input/output file paths
- SVG file not found
- Invalid dimension parameters
- No animations detected (without manual duration)
- Infinite animations (without manual duration)

### System Errors
- FFmpeg not installed
- Insufficient disk space
- File permission errors
- Puppeteer launch failures

## Output Video Specifications

### Format
- Container: MP4
- Video Codec: H.264 (most widely compatible)
- Frame Rate: 30fps (default, configurable)
- Quality: High quality preset for good file size/quality balance

### Compatibility
- Twitter/X: ✓
- YouTube: ✓
- Standard media players (VLC, Windows Media Player, QuickTime): ✓
- Web browsers (all modern browsers): ✓

## File Structure
```
svg-video/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── lib/
│   │   ├── svg-analyzer.ts   # SVG parsing and duration detection
│   │   ├── template-generator.ts # Handlebars template generation
│   │   ├── recorder.ts       # Puppeteer recording logic
│   │   ├── video-processor.ts # FFmpeg processing
│   │   └── utils.ts          # Utility functions
│   └── templates/
│       └── page.hbs          # Handlebars template
├── bin/
│   └── index.js              # Built output (generated by Vite)
├── tests/                    # Vitest test files (future)
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite build configuration
├── package.json
├── README.md
├── animation.svg             # Example/test SVG file
└── .ai/
    └── PLAN.md               # This file
```

## Testing Strategy

### Test Cases
1. Simple SMIL animation with known duration
2. Multiple animations with different durations
3. SVG with no animations + manual duration parameter
4. SVG with custom dimensions
5. SVG with viewBox only (no width/height)
6. Large SVG (test max-width/max-height constraints)
7. Invalid SVG file
8. Missing input file

### Test Files
- Create sample SVG files for each test case
- Use the reference file: `animation.svg` (from OpenClipart)

## Future Enhancements
- Support CSS animations detection
- Support JavaScript-based animations
- Progress bar during recording
- Multiple output formats (WebM, GIF)
- Batch processing multiple SVG files
- Configuration file support
- Background color override option
- Transparent background support (for WebM output)
- Preview mode (open browser instead of recording)

## Implementation Phases

### Phase 0: Project Setup
1. Create TypeScript configuration (`tsconfig.json`)
2. Create Vite configuration (`vite.config.ts`) for library mode
3. Set up build script to output to `./bin/index.js` with shebang
4. Verify ts-node can run `src/index.ts` directly
5. Install all dependencies (runtime + dev dependencies)

### Phase 1: Core Functionality
1. Implement CLI argument parsing
2. Implement SVG analyzer (basic SMIL duration detection)
3. Implement template generator
4. Implement Puppeteer recorder
5. Implement FFmpeg processor
6. Wire everything together

### Phase 2: Error Handling & Polish
1. Add comprehensive error handling
2. Add input validation
3. Add progress indicators
4. Write README with usage examples
5. Test with various SVG files (including `animation.svg`)

### Phase 3: Testing & Documentation
1. Set up Vitest for automated testing
2. Create test suite
3. Test edge cases
4. Write comprehensive documentation
5. Create example SVG files

## Notes
- The reference SVG (in `./animation.svg` file) has animations with durations ranging from 1s to 76s, with some very long durations like 44444s (infinite-like animations)
- ✅ **Implemented**: Automatic loop detection for infinite animations
  - The tool now detects `repeatCount="indefinite"` animations
  - Extracts the base loop duration (e.g., `dur="76s"`)
  - Filters out placeholder durations (e.g., 44444s) by prioritizing explicit infinite loops
  - Automatically records one complete seamless loop
  - Manual duration override still available via `-d` option
- CSS `max-width` and `max-height` will ensure SVG doesn't overflow the page
- Using `<img>` tag approach is simpler than inline SVG for initial implementation
- File path handling should support both absolute and relative paths
- Temporary files should be created in system temp directory
- Vite library mode will bundle only the TypeScript source code; dependencies will be resolved from `node_modules/` at runtime
- The built output at `./bin/index.js` must start with `#!/usr/bin/env node` shebang
- Node.js 22 LTS is the minimum required version
- Manual testing during development: `npx ts-node src/index.ts animation.svg output.mp4`
- Automated tests will use Vitest (future implementation)
