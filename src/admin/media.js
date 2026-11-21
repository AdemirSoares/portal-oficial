import { supabase } from '../supabase.js';

const bucket = 'article-media';
const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const maxSize = 8 * 1024 * 1024;

export async function prepareImage(file) {
  if (!file || !Object.hasOwn(extensions, file.type) || file.size > maxSize) {
    throw new Error('Escolha uma imagem JPG, PNG ou WebP de até 8 MiB.');
  }

  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const matches = (signature, offset = 0) => signature.every((byte, index) => bytes[offset + index] === byte);
  const valid =
    (file.type === 'image/jpeg' && matches([255, 216, 255])) ||
    (file.type === 'image/png' && matches([137, 80, 78, 71, 13, 10, 26, 10])) ||
    (file.type === 'image/webp' && matches([82, 73, 70, 70]) && matches([87, 69, 66, 80], 8));
  if (!valid) throw new Error('O conteúdo da imagem não corresponde ao formato informado.');

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 512 * 1024) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const optimized = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', .84));
    if (optimized?.type === 'image/webp' && optimized.size <= maxSize
      && (scale < 1 || optimized.size < file.size)) return optimized;
    return file;
  } catch {
    throw new Error('Não foi possível abrir a imagem. Tente outro arquivo.');
  } finally {
    bitmap?.close();
  }
}

export async function signedPreviews(items) {
  if (!items.length) return new Map();
  const { data, error } = await supabase.storage.from(bucket)
    .createSignedUrls(items.map((item) => item.object_path), 900);
  if (error) throw error;
  return new Map(data.filter((item) => item.signedUrl).map((item) => [item.path, item.signedUrl]));
}

export async function uploadImage(articleId, file) {
  const path = `${articleId}/${crypto.randomUUID()}.${extensions[file.type]}`;
  const { error } = await supabase.storage.from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function removeImages(paths) {
  if (!paths.length) return;
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) throw error;
}
