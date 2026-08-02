import { describe, it, expect } from 'vitest';
import { generateHTML } from './template-generator.js';

describe('generateHTML', () => {
  it('embeds the given dimensions', async () => {
    const html = await generateHTML({
      svgPath: 'animation.svg',
      width: 640,
      height: 480,
    });

    expect(html).toContain('width: 640px;');
    expect(html).toContain('height: 480px;');
    expect(html).toContain('max-width: 640px;');
    expect(html).toContain('max-height: 480px;');
  });

  it('injects custom CSS into the style block', async () => {
    const html = await generateHTML({
      svgPath: 'animation.svg',
      width: 640,
      height: 480,
      style: 'body > img { filter: blur(2px); }',
    });

    // The custom CSS must appear inside the <style> element...
    const styleBlock = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
    expect(styleBlock).toContain('body > img { filter: blur(2px); }');
  });

  it('does not HTML-escape custom CSS (raw output)', async () => {
    const html = await generateHTML({
      svgPath: 'animation.svg',
      width: 640,
      height: 480,
      style: 'body > div { color: red; }',
    });

    expect(html).toContain('body > div { color: red; }');
    expect(html).not.toContain('&gt;');
  });

  it('omits custom CSS when none is provided', async () => {
    const html = await generateHTML({
      svgPath: 'animation.svg',
      width: 640,
      height: 480,
    });

    expect(html).toContain('<style>');
    expect(html).not.toContain('undefined');
  });
});
