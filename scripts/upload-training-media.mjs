import { readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const mediaDirectory = join(projectRoot, "public", "media");

loadEnvConfig(projectRoot);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SECRET_KEY trong môi trường.");
}

const bucket = "training-media";
const releaseDirectory = "home-guides/v3";
const slugs = [
  "huong-dan-giam-khao-tao-de-thi",
  "huong-dan-giam-khao-tao-ky-thi",
  "huong-dan-giam-khao-kich-ban-vor-dme",
  "huong-dan-giam-khao-kich-ban-ads-b",
  "huong-dan-thi-sinh-luyen-tap",
  "huong-dan-thi-sinh-vao-thi",
];
const formats = [
  { extension: "mp4", contentType: "video/mp4" },
  { extension: "webp", contentType: "image/webp" },
  { extension: "mp3", contentType: "audio/mpeg" },
];

const assets = slugs.flatMap((slug) => formats.map(({ extension, contentType }) => {
  const fileName = `${slug}.${extension}`;
  const localPath = join(mediaDirectory, fileName);
  const size = statSync(localPath).size;
  return { fileName, localPath, size, contentType, remotePath: `${releaseDirectory}/${fileName}` };
}));

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existingFiles, error: listError } = await supabase.storage
  .from(bucket)
  .list(releaseDirectory, { limit: 100 });

if (listError) throw listError;

const existingByName = new Map((existingFiles ?? []).map((file) => [file.name, file]));
let uploaded = 0;
let skipped = 0;

for (const asset of assets) {
  const existing = existingByName.get(asset.fileName);
  const existingSize = Number(existing?.metadata?.size ?? -1);
  if (existing) {
    if (existingSize !== asset.size) {
      throw new Error(`Từ chối ghi đè ${asset.remotePath}: kích thước remote ${existingSize}, local ${asset.size}.`);
    }
    skipped += 1;
    console.log(`Đã tồn tại, bỏ qua: ${asset.remotePath}`);
    continue;
  }

  const { error } = await supabase.storage.from(bucket).upload(
    asset.remotePath,
    readFileSync(asset.localPath),
    {
      cacheControl: "31536000",
      contentType: asset.contentType,
      upsert: false,
    },
  );
  if (error) throw error;
  uploaded += 1;
  console.log(`Đã tải lên: ${asset.remotePath}`);
}

const { data: finalFiles, error: finalListError } = await supabase.storage
  .from(bucket)
  .list(releaseDirectory, { limit: 100 });
if (finalListError) throw finalListError;

const finalNames = new Set((finalFiles ?? []).map((file) => file.name));
const missing = assets.filter((asset) => !finalNames.has(asset.fileName));
if (missing.length > 0) {
  throw new Error(`Upload chưa đầy đủ: ${missing.map((asset) => asset.fileName).join(", ")}`);
}

console.log(`Hoàn tất v3: tải mới ${uploaded}, bỏ qua ${skipped}, tổng ${assets.length} asset.`);
console.log(`${supabaseUrl}/storage/v1/object/public/${bucket}/${releaseDirectory}`);
