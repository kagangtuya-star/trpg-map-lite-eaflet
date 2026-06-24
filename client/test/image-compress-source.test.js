import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const source = readFileSync(fileURLToPath(new URL('../src/lib/image-compress.js', import.meta.url)), 'utf8');

describe('image compression helper source', () => {
  it('exports upload compression helpers', () => {
    expect(source).toContain('export async function prepareCursorUpload');
    expect(source).toContain('export async function prepareMarkerIconUpload');
    expect(source).toContain('export async function compressImageForUpload');
  });

  it('uses webp canvas compression with explicit dimensions', () => {
    expect(source).toContain('canvas.toBlob');
    expect(source).toContain('image/webp');
    expect(source).toContain('maxWidth: 64');
    expect(source).toContain('maxWidth: 128');
  });

  it('keeps cursor formats that canvas should not rewrite and rejects gif', () => {
    expect(source).toContain("'.cur'");
    expect(source).toContain("'.ico'");
    expect(source).toContain("'.svg'");
    expect(source).toContain('GIF uploads are not supported');
  });
});
