import fs from "node:fs";

const projectRoot = "C:/Users/nhhai/Desktop/cns-simulator";
const batches = JSON.parse(fs.readFileSync(`${projectRoot}/.ua/intermediate/batches.json`, "utf8"));
const batch = batches.batches.find((item) => item.batchIndex === 6);
if (!batch) throw new Error("Không tìm thấy batchIndex 6");
fs.writeFileSync(
  `${projectRoot}/.ua/tmp/ua-file-analyzer-input-6.json`,
  `${JSON.stringify({ projectRoot, batchFiles: batch.files, batchImportData: batch.batchImportData }, null, 2)}\n`,
);
