// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { shrinkImage } from '../../src/components/shrinkImage';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubBitmap(width: number, height: number) {
  const close = vi.fn();
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(() => Promise.resolve({ width, height, close })),
  );
  return close;
}

function stubCanvas(context: { drawImage: () => void } | null) {
  const toDataURL = vi.fn(() => 'data:image/jpeg;base64,QUJD');
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D | null,
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(toDataURL);
  return toDataURL;
}

describe('shrinkImage', () => {
  it('scales a large photo to 800 px and returns base64 JPEG', async () => {
    const close = stubBitmap(3200, 1600);
    const drawImage = vi.fn();
    const toDataURL = stubCanvas({ drawImage });
    const out = await shrinkImage(new Blob(['x']));
    expect(out).toEqual({ base64: 'QUJD', mimeType: 'image/jpeg' });
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 800, 400);
    expect(toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8);
    expect(close).toHaveBeenCalledOnce();
  });

  it('never upscales a small photo', async () => {
    stubBitmap(200, 100);
    const drawImage = vi.fn();
    stubCanvas({ drawImage });
    await shrinkImage(new Blob(['x']));
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 200, 100);
  });

  it('throws a helpful message without a canvas context', async () => {
    stubBitmap(10, 10);
    stubCanvas(null);
    await expect(shrinkImage(new Blob(['x']))).rejects.toThrow(
      'This browser cannot read photos. Type the number instead.',
    );
  });
});
