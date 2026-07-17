/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('child_process');
const fs = require('fs');

const mediaRoot = 'public/media';
const storageRoot = 'ss:///training-media/home-guides/v1';
const cacheControl = 'public, max-age=31536000, immutable';
const clips = [
  'huong-dan-giam-khao-vor',
  'huong-dan-giam-khao-dme',
  'huong-dan-giam-khao-ads-b',
  'huong-dan-thi-sinh-vor',
  'huong-dan-thi-sinh-dme',
  'huong-dan-thi-sinh-ads-b'
];

clips.forEach((clip) => {
  ['mp4', 'webp', 'mp3'].forEach((ext) => {
    const fileName = `${clip}.${ext}`;
    const source = `${mediaRoot}/${fileName}`;
    if (!fs.existsSync(source)) {
      if (ext === 'mp3') return; // mp3 là tùy chọn
      console.error(`Không tìm thấy file bắt buộc: ${source}`);
      process.exit(1);
    }

    const dest = `${storageRoot}/${fileName}`;
    console.log(`Đang tải lên ${fileName} -> ${dest}...`);
    try {
      try {
        // Xóa file cũ trước để ghi đè thành công
        execSync(`npx supabase storage rm "${dest}" --linked --experimental`, { stdio: 'ignore' });
      } catch {
        // Bỏ qua nếu file chưa tồn tại trên storage
      }
      execSync(`npx supabase storage cp "${source}" "${dest}" --linked --experimental --cache-control "${cacheControl}"`, { stdio: 'inherit' });
    } catch {
      console.warn(`Lưu ý: Tải lên thất bại: ${fileName}`);
      if (ext === 'mp3') {
        console.warn(`Lưu ý thêm: File mp3 thất bại có thể do Supabase Storage chưa cấu hình cho phép loại MIME type audio/mpeg.`);
      }
    }
  });
});
console.log('Hoàn thành quá trình đồng bộ!');
