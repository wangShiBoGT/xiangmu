/** 图片理解：上传图片压缩为小尺寸 dataURL，喂给视觉模型并可存进历史 */

export const ACCEPT_IMAGE_EXTS = ".jpg,.jpeg,.png,.webp,.gif,.bmp";

/** 每条消息最多带的图片数（小视觉模型上下文有限） */
export const MAX_IMAGES = 2;

/** 最长边像素：既够模型看清，又控制 localStorage 体积 */
export const MAX_IMAGE_EDGE = 512;

const IMAGE_EXT_SET = new Set(ACCEPT_IMAGE_EXTS.split(","));

export function isImageFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return name.includes(".") && IMAGE_EXT_SET.has(`.${ext}`);
}

/** 读取图片并按最长边缩放，输出 JPEG dataURL */
export async function fileToDataURL(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("浏览器不支持图片处理");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}
