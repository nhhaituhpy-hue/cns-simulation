const fs = require('node:fs');

const [graphPath, layersPath, tourPath, outputPath, commitHash] = process.argv.slice(2);
const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
const layersRaw = JSON.parse(fs.readFileSync(layersPath, 'utf8'));
const tourRaw = JSON.parse(fs.readFileSync(tourPath, 'utf8'));
const nodeIds = new Set(graph.nodes.map((node) => node.id));
const knownPrefixes = /^(file|config|document|service|pipeline|table|schema|resource|endpoint):/;

const normalizeId = (value) => {
  const raw = typeof value === 'object' && value !== null ? value.id : value;
  if (typeof raw !== 'string') return null;
  return knownPrefixes.test(raw) ? raw : `file:${raw}`;
};

const layersSource = Array.isArray(layersRaw) ? layersRaw : layersRaw.layers || [];
const layers = layersSource.map((layer) => {
  const sourceIds = layer.nodeIds || layer.nodes || [];
  const nodeIdsForLayer = sourceIds.map(normalizeId).filter((id) => id && nodeIds.has(id));
  const slug = String(layer.name || 'unnamed')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    id: layer.id || `layer:${slug}`,
    name: layer.name || 'Lớp chưa đặt tên',
    description: layer.description || 'Chưa có mô tả.',
    nodeIds: nodeIdsForLayer,
  };
});

const tourSource = Array.isArray(tourRaw) ? tourRaw : tourRaw.steps || [];
const tour = tourSource.map((step, index) => ({
  order: Number.isInteger(step.order) ? step.order : index + 1,
  title: step.title || `Bước ${index + 1}`,
  description: step.description || step.whyItMatters || 'Chưa có mô tả.',
  nodeIds: (step.nodeIds || step.nodesToInspect || [])
    .map(normalizeId)
    .filter((id) => id && nodeIds.has(id)),
  ...(typeof step.languageLesson === 'string' ? { languageLesson: step.languageLesson } : {}),
})).sort((a, b) => a.order - b.order);

const output = {
  version: '1.0.0',
  project: {
    name: 'cns-simulator',
    languages: ['config', 'css', 'javascript', 'json', 'markdown', 'mts', 'sql', 'toml', 'typescript', 'unknown', 'webp', 'yaml'],
    frameworks: ['GitHub Actions', 'Next.js', 'React', 'Tailwind CSS', 'Vitest', 'Zustand'],
    description: 'Ứng dụng web phục vụ xây dựng kịch bản, thực hành chẩn đoán và đánh giá kỹ thuật viên trên ba nhóm thiết bị CNS: VOR, DME và ADS-B. Dự án có hơn 100 file nguồn và được phân tích toàn bộ.',
    analyzedAt: new Date().toISOString(),
    gitCommitHash: commitHash,
  },
  nodes: graph.nodes,
  edges: graph.edges,
  layers,
  tour,
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
