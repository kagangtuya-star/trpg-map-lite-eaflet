const RAW_UPLOAD_EXTENSIONS = new Set(['.cur', '.ico', '.svg']);

function extensionOf(file) {
  const name = file?.name || '';
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

function renameAsWebp(file) {
  const base = (file.name || 'upload').replace(/\.[^.]+$/, '');
  return `${base}.webp`;
}

function shouldKeepOriginal(file) {
  return RAW_UPLOAD_EXTENSIONS.has(extensionOf(file));
}

function assertSupported(file) {
  if (extensionOf(file) === '.gif' || file.type === 'image/gif') {
    throw new Error('GIF uploads are not supported because animation would be lost during compression.');
  }
}

function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to decode image for compression.'));
    };
    image.src = url;
  });
}

function scaleSize(width, height, maxWidth, maxHeight) {
  const ratio = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio))
  };
}

export async function compressImageForUpload(file, options) {
  assertSupported(file);
  if (shouldKeepOriginal(file)) return file;

  const image = await blobToImage(file);
  const size = scaleSize(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    options.maxWidth,
    options.maxHeight
  );
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, size.width, size.height);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error('Unable to compress image.'));
      },
      'image/webp',
      options.quality ?? 0.86
    );
  });

  return new File([blob], renameAsWebp(file), { type: 'image/webp' });
}

export async function prepareCursorUpload(file) {
  return compressImageForUpload(file, { maxWidth: 64, maxHeight: 64, quality: 0.86 });
}

export async function prepareMarkerIconUpload(file) {
  return compressImageForUpload(file, { maxWidth: 128, maxHeight: 128, quality: 0.86 });
}
