/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('child_process');
const fs = require('fs');

const mediaRoot = 'public/media';
const storageRoot = 'ss:///training-media/home-guides/v2';
const cacheControl = 'public, max-age=31536000, immutable';

const filesToUpload = [
  // Hướng dẫn Giám khảo VOR
  { source: `${mediaRoot}/huong-dan-giam-khao-vor.mp4`, dest: `${storageRoot}/huong-dan-giam-khao-vor.mp4`, required: true },
  { source: `${mediaRoot}/huong-dan-giam-khao-vor.webp`, dest: `${storageRoot}/huong-dan-giam-khao-vor.webp`, required: true },
  { source: `${mediaRoot}/huong-dan-giam-khao-vor-dme.mp3`, dest: `${storageRoot}/huong-dan-giam-khao-vor-dme.mp3`, required: false },

  // Hướng dẫn Giám khảo ADS-B
  { source: `${mediaRoot}/huong-dan-giam-khao-ads-b.mp4`, dest: `${storageRoot}/huong-dan-giam-khao-ads-b.mp4`, required: true },
  { source: `${mediaRoot}/huong-dan-giam-khao-ads-b.webp`, dest: `${storageRoot}/huong-dan-giam-khao-ads-b.webp`, required: true },
  { source: `${mediaRoot}/huong-dan-giam-khao-adsb.mp3`, dest: `${storageRoot}/huong-dan-giam-khao-adsb.mp3`, required: false },

  // Hướng dẫn Thí sinh VOR
  { source: `${mediaRoot}/huong-dan-thi-sinh-vor.mp4`, dest: `${storageRoot}/huong-dan-thi-sinh-vor.mp4`, required: true },
  { source: `${mediaRoot}/huong-dan-thi-sinh-vor.webp`, dest: `${storageRoot}/huong-dan-thi-sinh-vor.webp`, required: true },

  // Hướng dẫn Thí sinh ADS-B
  { source: `${mediaRoot}/huong-dan-thi-sinh-ads-b.mp4`, dest: `${storageRoot}/huong-dan-thi-sinh-ads-b.mp4`, required: true },
  { source: `${mediaRoot}/huong-dan-thi-sinh-ads-b.webp`, dest: `${storageRoot}/huong-dan-thi-sinh-ads-b.webp`, required: true }
];

filesToUpload.forEach(({ source, dest, required }) => {
  const fileName = source.split('/').pop();
  if (!fs.existsSync(source)) {
    if (required) {
      console.error(`Không tìm thấy file bắt buộc: ${source}`);
      process.exit(1);
    }
    return; // mp3 tùy chọn, bỏ qua nếu chưa có
  }

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
    if (source.endsWith('.mp3')) {
      console.warn(`Lưu ý thêm: File mp3 thất bại có thể do Supabase Storage chưa cấu hình cho phép loại MIME type audio/mpeg.`);
    }
  }
});
console.log('Hoàn thành quá trình đồng bộ!');
