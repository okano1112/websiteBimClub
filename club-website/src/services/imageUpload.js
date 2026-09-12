const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

/**
 * BIM CLUB — SERVER IMAGE VALIDATION
 *
 * PURPOSE:
 * ตรวจไฟล์ภาพจาก bytes จริงก่อนนำไปเก็บใน public uploads
 *
 * MODIFY HERE:
 * เปลี่ยนชนิดไฟล์/ขนาดสูงสุด/เพดานพิกเซลของ image upload ได้ที่ constants ด้านล่าง
 *
 * DATA SOURCE:
 * รับ Buffer จาก Multer memoryStorage; ไม่อ่านข้อมูลผู้ใช้หรือฐานข้อมูล
 *
 * IMAGES:
 * ผลลัพธ์เป็นไฟล์ที่ตั้งชื่อด้วย crypto random ID และนามสกุลจาก decoder เท่านั้น
 *
 * DO NOT MODIFY:
 * อย่าข้ามการตรวจ `sharp` แล้วเชื่อ MIME หรือ extension จาก browser
 *
 * ADD AN ITEM:
 * เรียก validateImageBuffer ก่อน saveValidatedImage ใน route ที่ต้องรับภาพ
 */

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 20_000_000;
const FORMAT_RULES = new Map([
  ['jpeg', { mimeTypes: new Set(['image/jpeg', 'image/jpg']), extension: '.jpg' }],
  ['png', { mimeTypes: new Set(['image/png']), extension: '.png' }],
  ['webp', { mimeTypes: new Set(['image/webp']), extension: '.webp' }]
]);

async function validateImageBuffer(buffer, declaredMime = '') {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('ไฟล์รูปภาพว่างหรือไม่ถูกต้อง');
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    const error = new Error('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5 MB');
    error.code = 'IMAGE_TOO_LARGE';
    throw error;
  }

  let metadata;
  try {
    metadata = await sharp(buffer, { failOn: 'error' }).metadata();
  } catch (error) {
    const invalid = new Error('ไฟล์รูปภาพเสียหายหรือไม่ใช่รูปภาพที่รองรับ');
    invalid.code = 'INVALID_IMAGE';
    invalid.cause = error;
    throw invalid;
  }

  const rule = FORMAT_RULES.get(metadata.format);
  if (!rule || !rule.mimeTypes.has(String(declaredMime).toLowerCase())) {
    const error = new Error('อนุญาตเฉพาะ JPG, JPEG, PNG และ WebP ที่มีชนิดไฟล์ตรงกัน');
    error.code = 'UNSUPPORTED_IMAGE';
    throw error;
  }
  if (!Number.isInteger(metadata.width) || !Number.isInteger(metadata.height) || metadata.width < 1 || metadata.height < 1) {
    const error = new Error('ไม่พบขนาดภาพที่ถูกต้อง');
    error.code = 'INVALID_IMAGE_DIMENSIONS';
    throw error;
  }
  if (metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
    const error = new Error('รูปภาพมีจำนวนพิกเซลมากเกิน 20 ล้านพิกเซล');
    error.code = 'IMAGE_TOO_MANY_PIXELS';
    throw error;
  }

  return {
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    extension: rule.extension,
    mimeType: metadata.format === 'jpeg' ? 'image/jpeg' : `image/${metadata.format}`
  };
}

async function saveValidatedImage(buffer, directory, imageInfo) {
  const filename = `${crypto.randomBytes(16).toString('hex')}${imageInfo.extension}`;
  const targetPath = path.join(directory, filename);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(targetPath, buffer, { flag: 'wx' });
  return { filename, path: targetPath };
}

module.exports = {
  FORMAT_RULES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_PIXELS,
  saveValidatedImage,
  validateImageBuffer
};
