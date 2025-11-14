import { writeFile } from 'fs/promises';
import Handlebars from 'handlebars';
import { resolve } from 'path';

export interface TemplateData {
  svgPath: string;
  width: number;
  height: number;
}

// Embedded template
const TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      width: {{width}}px;
      height: {{height}}px;
      overflow: hidden;
      background: transparent;
    }
    img {
      max-width: {{width}}px;
      max-height: {{height}}px;
      display: block;
    }
  </style>
</head>
<body>
  <img src="file://{{svgPath}}" />
</body>
</html>`;

/**
 * Generate HTML from template
 */
export async function generateHTML(data: TemplateData): Promise<string> {
  // Compile template
  const template = Handlebars.compile(TEMPLATE);

  // Generate HTML with absolute path for SVG
  const htmlContent = template({
    svgPath: resolve(data.svgPath),
    width: data.width,
    height: data.height,
  });

  return htmlContent;
}

/**
 * Generate and write HTML to temporary file
 */
export async function generateHTMLFile(
  data: TemplateData,
  outputPath: string
): Promise<void> {
  const html = await generateHTML(data);
  await writeFile(outputPath, html, 'utf-8');
}
