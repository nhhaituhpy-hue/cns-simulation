const fs = require('fs');

const [sourcePath, outputPath] = process.argv.slice(2);
if (!sourcePath || !outputPath) {
  console.error('Usage: node ua-arch-prepare.js <assembled-graph.json> <output.json>');
  process.exit(1);
}

const fileLevelTypes = new Set([
  'file', 'config', 'document', 'service', 'pipeline',
  'table', 'schema', 'resource', 'endpoint',
]);

try {
  const graph = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const fileNodes = graph.nodes
    .filter((node) => fileLevelTypes.has(node.type))
    .map(({ id, type, name, filePath, summary, tags }) => ({
      id,
      type,
      name,
      filePath,
      summary: summary || '',
      tags: Array.isArray(tags) ? tags : [],
    }));
  const ids = new Set(fileNodes.map((node) => node.id));
  const allEdges = graph.edges.filter(
    (edge) => ids.has(edge.source) && ids.has(edge.target),
  );
  const importEdges = allEdges.filter((edge) => edge.type === 'imports');

  fs.writeFileSync(
    outputPath,
    `${JSON.stringify({ fileNodes, importEdges, allEdges }, null, 2)}\n`,
  );
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
