# svg-video

Convert SVG animations to MP4 video files using headless browser automation.

## Features

- Convert SMIL-animated SVGs to MP4 videos
- **Automatic loop detection** for infinite animations with `repeatCount="indefinite"`
- Automatic animation duration calculation for finite animations
- Manual duration override for CSS/JavaScript animations or custom lengths
- Customizable output dimensions and frame rate
- H.264 encoding for maximum compatibility
- Support for complex SVG animations

## Installation

### Prerequisites

- Node.js 22 or later
- FFmpeg (must be installed on your system)

Install FFmpeg:
- **Ubuntu/Debian**: `sudo apt install ffmpeg`
- **macOS**: `brew install ffmpeg`
- **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

### Install from npm

```bash
npm install -g svg-video
```

### Install from source

```bash
git clone <repository-url>
cd svg-video
npm install
npm run build
npm link
```

## Usage

### Basic Usage

```bash
svg-video input.svg output.mp4
```

This will analyze the SVG file, detect animation duration automatically, and create an MP4 video.

### With Options

```bash
# Set custom dimensions
svg-video input.svg output.mp4 --width 1920 --height 1080

# Override animation duration (5 seconds)
svg-video input.svg output.mp4 -d 5

# Set custom frame rate
svg-video input.svg output.mp4 -f 60

# Combine options
svg-video input.svg output.mp4 -w 1280 -h 720 -d 10 -f 30
```

### Command Line Options

- `-w, --width <pixels>` - Maximum width of the output video (default: from SVG)
- `-h, --height <pixels>` - Maximum height of the output video (default: from SVG)
- `-d, --duration <seconds>` - Override animation duration (optional for infinite loops with detectable duration)
- `-f, --fps <number>` - Frame rate (default: 30)

## Supported Animation Types

### SMIL Animations (Automatically Detected)

The tool automatically detects and calculates duration for SMIL animations:

- `<animate>` - Animate attribute values
- `<animateTransform>` - Animate transformations
- `<animateMotion>` - Animate along a path
- `<set>` - Set attribute values
- `<animateColor>` - Animate colors

Example SVG with SMIL animation:

```xml
<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="20" fill="blue">
    <animate attributeName="r" from="20" to="40" dur="2s" repeatCount="indefinite"/>
  </circle>
</svg>
```

### CSS and JavaScript Animations (Manual Duration Required)

For CSS animations or JavaScript-based animations, you must specify the duration manually:

```bash
svg-video animated.svg output.mp4 -d 10
```

## Animation Duration Detection

The tool automatically analyzes SMIL animations and calculates total duration based on:

- `dur` attribute (supports `1s`, `1000ms`, `1.5s` formats)
- `begin` attribute (delayed starts)
- `repeatCount` and `repeatDur` (repeating animations)

### Infinite Loop Detection

For animations with `repeatCount="indefinite"`, the tool now **automatically detects the loop duration** and records one complete cycle. This is perfect for seamless looping animations!

```bash
# Automatically detects and records one 76-second loop
svg-video animation.svg output.mp4

# Or manually override the duration
svg-video animation.svg output.mp4 -d 10
```

The tool intelligently:
- Identifies animations with `repeatCount="indefinite"`
- Extracts the base loop duration from the `dur` attribute
- Filters out placeholder durations (e.g., very long durations like 44444s)
- Uses the shortest reasonable loop duration for recording

**Manual override:** You can still specify duration manually with the `-d` option to capture multiple loops or a specific duration.

## Output Format

Generated videos use the following specifications:

- **Container**: MP4
- **Video Codec**: H.264 (libx264)
- **Quality**: CRF 23 (high quality)
- **Pixel Format**: yuv420p (maximum compatibility)
- **Frame Rate**: 30fps (default, configurable)
- **Optimization**: Fast start enabled for web playback

These settings ensure compatibility with:
- Twitter/X
- YouTube
- All modern web browsers
- Standard media players (VLC, Windows Media Player, QuickTime)

## Examples

### Example 1: Simple Animation

```bash
svg-video circle-animation.svg circle.mp4
```

### Example 2: High Resolution

```bash
svg-video logo-animation.svg logo.mp4 --width 3840 --height 2160
```

### Example 3: Infinite Loop Animation

For an SVG with `repeatCount="indefinite"`, the tool automatically detects the loop:

```bash
# Automatically detects and records one complete loop
svg-video infinite-loop.svg output.mp4

# Or manually specify duration to capture multiple loops or custom length
svg-video infinite-loop.svg output.mp4 -d 10
```

### Example 4: High Frame Rate

Create smooth 60fps video:

```bash
svg-video animation.svg smooth-output.mp4 -f 60
```

## Development

### Project Structure

```
svg-video/
├── src/
│   ├── index.ts                    # CLI entry point
│   ├── lib/
│   │   ├── svg-analyzer.ts         # SVG parsing and duration detection
│   │   ├── template-generator.ts   # HTML template generation
│   │   ├── recorder.ts             # Puppeteer recording logic
│   │   ├── video-processor.ts      # FFmpeg processing
│   │   └── utils.ts                # Utility functions
├── bin/
│   └── index.js                    # Built output
├── tsconfig.json
├── vite.config.ts
└── package.json
```

### Build Commands

```bash
# Build for production
npm run build

# Run tests
npm test

# Run directly from source (development)
npm run dev input.svg output.mp4
```

### Testing During Development

You can run the tool directly from TypeScript source without building:

```bash
npx ts-node src/index.ts animation.svg output.mp4
```

## Troubleshooting

### FFmpeg Not Found

**Error**: `FFmpeg is not installed`

**Solution**: Install FFmpeg on your system:
- Ubuntu/Debian: `sudo apt install ffmpeg`
- macOS: `brew install ffmpeg`
- Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

### No Animations Detected

**Error**: `No animations detected in SVG`

**Solution**: 
1. Verify your SVG contains SMIL animation elements
2. For CSS/JavaScript animations, specify duration manually: `-d <seconds>`

### Infinite Animations

**Error**: `SVG contains infinite animations`

**Solution**: Use the `-d` option to specify how long to record:

```bash
svg-video input.svg output.mp4 -d 10
```

### Invalid SVG Dimensions

**Error**: `Unable to extract valid dimensions from SVG`

**Solution**: Ensure your SVG has either:
- `width` and `height` attributes, OR
- A `viewBox` attribute

### Puppeteer Browser Launch Failed

**Error**: `Failed to record animation: Failed to launch chrome`

**Solution**: Install required system dependencies:
- Ubuntu/Debian: `sudo apt install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget`

## Technical Details

### How It Works

1. **Analyze SVG**: Parses the SVG file to extract dimensions and detect SMIL animations
2. **Calculate Duration**: Analyzes animation timing attributes to determine total duration
3. **Generate HTML**: Creates an HTML page that displays the SVG
4. **Record with Puppeteer**: Launches a headless browser and records the animation
5. **Process with FFmpeg**: Converts the recording to MP4 format with optimal settings
6. **Cleanup**: Removes temporary files

### Dependencies

- **Puppeteer**: Headless browser automation for rendering SVG
- **puppeteer-screen-recorder**: Screen recording capability
- **fluent-ffmpeg**: FFmpeg wrapper for video processing
- **@xmldom/xmldom**: SVG/XML parsing
- **handlebars**: HTML template engine
- **@jcubic/lily**: Command-line argument parser

## Limitations

- CSS animations require manual duration specification
- JavaScript-based animations require manual duration specification
- Very large SVGs may take longer to process
- Recording quality depends on system performance

## Future Enhancements

- Support for CSS animation detection
- Support for JavaScript-based animation detection
- Progress bar during recording
- Multiple output formats (WebM, GIF)
- Batch processing multiple SVG files
- Configuration file support
- Background color override option
- Transparent background support
- Preview mode

## License

MIT

## Author

Jakub T. Jankiewicz <jcubic@onet.pl> (https://jakub.jankiewicz.org/)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Links

- [GitHub Repository](<repository-url>)
- [Issue Tracker](<repository-url>/issues)
- [NPM Package](https://www.npmjs.com/package/svg-video)
