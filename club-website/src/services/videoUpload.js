const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const run = promisify(execFile);
const limitProbe = require('./workLimit')(2);
async function probeVideo(filePath) {
  try {
    const { stdout } = await run(process.env.FFPROBE_PATH || 'ffprobe', [
      '-v', 'error', '-protocol_whitelist', 'file', '-format_whitelist', 'mov,matroska,webm,ogg',
      '-show_entries', 'format=format_name,duration:format_tags=major_brand:stream=codec_type,codec_name,width,height', '-of', 'json', filePath
    ], { timeout: 15000, maxBuffer: 256 * 1024 });
    const info = JSON.parse(stdout);
    const stream = info.streams?.find(s => s.codec_type === 'video' && s.width > 0 && s.height > 0 && s.width * s.height <= 33_177_600);
    const duration = Number(info.format?.duration);
    if (!stream || !Number.isFinite(duration) || duration <= 0) throw Error('Invalid video stream');
    const formats = String(info.format.format_name).split(',');
    const extension = formats.includes('mov') ? (String(info.format.tags?.major_brand).trim() === 'qt' ? '.mov' : '.mp4') : formats.includes('webm') && ['vp8','vp9','av1'].includes(stream.codec_name) ? '.webm' : formats.includes('ogg') ? '.ogg' : null;
    if (!extension) throw Error('Unsupported video container');
    return { extension, duration, width: stream.width, height: stream.height };
  } catch (cause) {
    const error = new Error('ไฟล์วิดีโอไม่ถูกต้องหรือไม่สามารถตรวจสอบได้ กรุณาใช้ MP4, WebM หรือ OGG');
    error.code = 'INVALID_VIDEO'; error.cause = cause; throw error;
  }
}
const validateVideo = filePath => limitProbe(() => probeVideo(filePath));
async function publishVideo(file, videosDir) {
  try {
    const info = await validateVideo(file.path);
    const filename = crypto.randomBytes(16).toString('hex') + info.extension;
    await fs.rename(file.path, path.join(videosDir, filename));
    return filename;
  } finally { await fs.rm(file.path, { force: true }); }
}
module.exports = { validateVideo, publishVideo };
