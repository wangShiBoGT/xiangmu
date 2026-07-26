import { describe, it, expect } from "vitest";
import { isImageFile, ACCEPT_IMAGE_EXTS, MAX_IMAGES } from "./images";

describe("isImageFile", () => {
  it("识别常见图片扩展名", () => {
    expect(isImageFile("photo.jpg")).toBe(true);
    expect(isImageFile("图.PNG")).toBe(true);
    expect(isImageFile("a.webp")).toBe(true);
  });

  it("文档和无扩展名不算图片", () => {
    expect(isImageFile("report.pdf")).toBe(false);
    expect(isImageFile("table.xlsx")).toBe(false);
    expect(isImageFile("noext")).toBe(false);
  });

  it("配置常量合理", () => {
    expect(ACCEPT_IMAGE_EXTS).toContain(".jpg");
    expect(MAX_IMAGES).toBeGreaterThan(0);
  });
});
