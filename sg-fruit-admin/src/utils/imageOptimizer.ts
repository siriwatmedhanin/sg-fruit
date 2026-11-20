export interface OptimizedImageResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  sizeBytes: number;
  sizeFormatted: string;
  quality: number;
  mimeType: string;
  percentageChange: number; // Negative means reduction, positive means larger
  isLarger: boolean;
}

export interface OptimizationBundle {
  original: {
    name: string;
    type: string;
    sizeBytes: number;
    sizeFormatted: string;
    width: number;
    height: number;
    url: string;
  };
  main: OptimizedImageResult;
  thumbnail: OptimizedImageResult;
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Validates real image file type by checking magic bytes in the file header
 */
export async function validateImageMagicBytes(file: File): Promise<string> {
  const buffer = await file.slice(0, 16).arrayBuffer();
  const arr = new Uint8Array(buffer);

  // JPEG: FF D8 FF
  if (arr[0] === 0xff && arr[1] === 0xd8 && arr[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    arr[0] === 0x89 &&
    arr[1] === 0x50 &&
    arr[2] === 0x4e &&
    arr[3] === 0x47 &&
    arr[4] === 0x0d &&
    arr[5] === 0x0a &&
    arr[6] === 0x1a &&
    arr[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: RIFF .... WEBP
  // arr[0-3] = 'RIFF' (0x52, 0x49, 0x46, 0x46)
  // arr[8-11] = 'WEBP' (0x57, 0x45, 0x42, 0x50)
  if (
    arr[0] === 0x52 &&
    arr[1] === 0x49 &&
    arr[2] === 0x46 &&
    arr[3] === 0x46 &&
    arr[8] === 0x57 &&
    arr[9] === 0x45 &&
    arr[10] === 0x42 &&
    arr[11] === 0x50
  ) {
    return 'image/webp';
  }

  throw new Error(
    'ประเภทไฟล์ไม่ถูกต้อง: รองรับเฉพาะไฟล์รูปภาพ JPEG (.jpg, .jpeg), PNG (.png), หรือ WebP (.webp) เท่านั้น (ตรวจพบ Header ไม่ตรง)'
  );
}

/**
 * Calculates target dimensions preserving aspect ratio without upscaling
 */
export function calculateTargetDimensions(
  srcWidth: number,
  srcHeight: number,
  maxDimension: number
): { width: number; height: number } {
  if (srcWidth <= 0 || srcHeight <= 0) {
    throw new Error('ขนาดมิติของภาพไม่ถูกต้อง');
  }

  // Never upscale if image is already smaller than maxDimension
  if (srcWidth <= maxDimension && srcHeight <= maxDimension) {
    return { width: srcWidth, height: srcHeight };
  }

  const ratio = maxDimension / Math.max(srcWidth, srcHeight);
  return {
    width: Math.max(1, Math.round(srcWidth * ratio)),
    height: Math.max(1, Math.round(srcHeight * ratio)),
  };
}

/**
 * Encodes canvas to real WebP Blob with verified MIME type
 */
function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('ไม่สามารถประมวลผล Canvas ออกมาเป็นรูปภาพได้'));
          return;
        }

        // Strict WebP check: Browser MUST output image/webp, never silently fallback to image/png
        if (blob.type !== 'image/webp') {
          reject(
            new Error(
              `เบราว์เซอร์ไม่รองรับการเข้ารหัสเป็น WebP โดยตรง (ได้รับ ${blob.type} แทน) ระบบถูกกำหนดให้ห้ามเปลี่ยน Format อัตโนมัติ`
            )
          );
          return;
        }

        resolve(blob);
      },
      'image/webp',
      quality
    );
  });
}

/**
 * Main optimization pipeline for SG FRUIT Admin
 * Produces Main Product Image (max 1600px, quality 85%) and Thumbnail (max 480px, quality 82%)
 */
export async function processImageOptimization(
  file: File,
  options?: { mainQuality?: number; thumbQuality?: number }
): Promise<OptimizationBundle> {
  // 1. Validate real image magic bytes (Header check for JPEG, PNG, WebP)
  const realMimeType = await validateImageMagicBytes(file);

  // 2. Load image using createImageBitmap with EXIF orientation handling
  // Note: Large images (even >15 MB) are allowed and decoded natively
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (err: any) {
    throw new Error(
      `ไม่สามารถถอดรหัสรูปภาพในเบราว์เซอร์ได้ (${formatBytes(file.size)}): ${
        err.message || 'ไฟล์อาจชำรุด หรือหน่วยความจำเบราว์เซอร์ไม่เพียงพอ (อาจพิจารณาประมวลผลฝั่ง Server ในขั้นตอนต่อไป)'
      }`
    );
  }

  const origWidth = bitmap.width;
  const origHeight = bitmap.height;

  // 3. Pixel safety guard: Limit to 70 Megapixels (~280 MB raw 2D pixel buffer) to prevent browser crash
  if (origWidth * origHeight > 70_000_000) {
    bitmap.close();
    throw new Error(
      `ความละเอียดของภาพ (${origWidth} × ${origHeight} = ${(
        (origWidth * origHeight) /
        1_000_000
      ).toFixed(1)} ล้านพิกเซล) สูงเกินกว่าที่เบราว์เซอร์จะประมวลผลบนเครื่องได้อย่างปลอดภัย (อาจพิจารณาประมวลผลฝั่ง Server ในขั้นตอนต่อไป)`
    );
  }

  const mainQuality = options?.mainQuality ?? 0.85;
  const thumbQuality = options?.thumbQuality ?? 0.82;

  try {
    // --- GENERATE MAIN PRODUCT IMAGE (Max 1600px, 85%) ---
    const mainDims = calculateTargetDimensions(origWidth, origHeight, 1600);
    const mainCanvas = document.createElement('canvas');
    mainCanvas.width = mainDims.width;
    mainCanvas.height = mainDims.height;
    const mainCtx = mainCanvas.getContext('2d');
    if (!mainCtx) throw new Error('ไม่สามารถสร้าง 2D Canvas Context ได้');

    // Preserve transparency: clearRect without opaque background fill
    mainCtx.clearRect(0, 0, mainDims.width, mainDims.height);
    mainCtx.imageSmoothingEnabled = true;
    mainCtx.imageSmoothingQuality = 'high';
    mainCtx.drawImage(bitmap, 0, 0, mainDims.width, mainDims.height);

    const mainBlob = await canvasToWebpBlob(mainCanvas, mainQuality);
    const mainUrl = URL.createObjectURL(mainBlob);
    const mainChange = ((mainBlob.size - file.size) / file.size) * 100;

    const mainResult: OptimizedImageResult = {
      blob: mainBlob,
      url: mainUrl,
      width: mainDims.width,
      height: mainDims.height,
      sizeBytes: mainBlob.size,
      sizeFormatted: formatBytes(mainBlob.size),
      quality: Math.round(mainQuality * 100),
      mimeType: mainBlob.type,
      percentageChange: parseFloat(mainChange.toFixed(1)),
      isLarger: mainBlob.size > file.size,
    };

    // --- GENERATE THUMBNAIL (Max 480px, 82%) ---
    const thumbDims = calculateTargetDimensions(origWidth, origHeight, 480);
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = thumbDims.width;
    thumbCanvas.height = thumbDims.height;
    const thumbCtx = thumbCanvas.getContext('2d');
    if (!thumbCtx) throw new Error('ไม่สามารถสร้าง 2D Canvas Context ได้');

    thumbCtx.clearRect(0, 0, thumbDims.width, thumbDims.height);
    thumbCtx.imageSmoothingEnabled = true;
    thumbCtx.imageSmoothingQuality = 'high';
    thumbCtx.drawImage(bitmap, 0, 0, thumbDims.width, thumbDims.height);

    const thumbBlob = await canvasToWebpBlob(thumbCanvas, thumbQuality);
    const thumbUrl = URL.createObjectURL(thumbBlob);
    const thumbChange = ((thumbBlob.size - file.size) / file.size) * 100;

    const thumbResult: OptimizedImageResult = {
      blob: thumbBlob,
      url: thumbUrl,
      width: thumbDims.width,
      height: thumbDims.height,
      sizeBytes: thumbBlob.size,
      sizeFormatted: formatBytes(thumbBlob.size),
      quality: Math.round(thumbQuality * 100),
      mimeType: thumbBlob.type,
      percentageChange: parseFloat(thumbChange.toFixed(1)),
      isLarger: thumbBlob.size > file.size,
    };

    const origUrl = URL.createObjectURL(file);

    return {
      original: {
        name: file.name,
        type: realMimeType,
        sizeBytes: file.size,
        sizeFormatted: formatBytes(file.size),
        width: origWidth,
        height: origHeight,
        url: origUrl,
      },
      main: mainResult,
      thumbnail: thumbResult,
    };
  } finally {
    // Crucial: Release ImageBitmap memory
    bitmap.close();
  }
}
