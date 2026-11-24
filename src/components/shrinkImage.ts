/** Longest side sent to the server: enough to read a display, small enough for slow mobile data. */
const MAX_SIDE_PX = 800;
const JPEG_QUALITY = 0.8;

/**
 * Downscale a photo in the browser and return base64 JPEG. Re-encoding also
 * drops EXIF data such as GPS position before anything leaves the phone.
 */
export async function shrinkImage(file: Blob): Promise<{ base64: string; mimeType: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (context === null)
    throw new Error('This browser cannot read photos. Type the number instead.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  return { base64: dataUrl.slice(dataUrl.indexOf(',') + 1), mimeType: 'image/jpeg' };
}
