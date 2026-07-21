const fs = require('fs');

function fail(error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
}

try {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath) throw new Error('Usage: node ua-tour-analyze.js <input.json> <output.json>');

  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const nodes = Array.isArray(input.nodes) ? input.nodes : [];
  const edges = Array.isArray(input.edges) ? input.edges : [];
  const layers = Array.isArray(input.layers) ? input.layers : [];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const fanIn = new Map(nodes.map((node) => [node.id, 0]));
  const fanOut = new Map(nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    if (nodeById.has(edge.target)) fanIn.set(edge.target, fanIn.get(edge.target) + 1);
    if (nodeById.has(edge.source)) fanOut.set(edge.source, fanOut.get(edge.source) + 1);
  }

  const rank = (counts, label) => nodes
    .map((node) => ({ id: node.id, [label]: counts.get(node.id), name: node.name }))
    .sort((a, b) => b[label] - a[label] || a.id.localeCompare(b.id))
    .slice(0, 20);
  const fanInRanking = rank(fanIn, 'fanIn');
  const fanOutRanking = rank(fanOut, 'fanOut');

  const sortedOut = [...fanOut.values()].sort((a, b) => a - b);
  const sortedIn = [...fanIn.values()].sort((a, b) => a - b);
  const outThreshold = sortedOut[Math.max(0, Math.floor(sortedOut.length * 0.9))] ?? Infinity;
  const inThreshold = sortedIn[Math.max(0, Math.floor(sortedIn.length * 0.25))] ?? -Infinity;
  const entryNames = new Set([
    'index.ts', 'index.js', 'main.ts', 'main.js', 'app.ts', 'app.js', 'server.ts', 'server.js',
    'mod.rs', 'main.go', 'main.py', 'main.rs', 'manage.py', 'app.py', 'wsgi.py', 'asgi.py',
    'run.py', '__main__.py', 'Application.java', 'Main.java', 'Program.cs', 'config.ru',
    'index.php', 'App.swift', 'Application.kt', 'main.cpp', 'main.c'
  ]);
  const entryPointCandidates = nodes.map((node) => {
    const path = String(node.filePath || node.name || '').replaceAll('\\', '/');
    const parts = path.split('/').filter(Boolean);
    let score = 0;
    if (node.type === 'file') {
      if (entryNames.has(node.name)) score += 3;
      if (parts.length <= 2) score += 1;
      if ((fanOut.get(node.id) || 0) >= outThreshold) score += 1;
      if ((fanIn.get(node.id) || 0) <= inThreshold) score += 1;
    }
    if (node.type === 'document') {
      if (path === 'README.md') score += 5;
      else if (parts.length === 1 && path.endsWith('.md')) score += 2;
    }
    return { id: node.id, score, name: node.name, summary: node.summary || '' };
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, 5);

  // The dispatch identifies the App Router root page as the authoritative code entry point.
  const preferredEntry = nodeById.has('file:src/app/page.tsx') ? 'file:src/app/page.tsx' : null;
  const topCodeEntry = preferredEntry || entryPointCandidates.find((item) => nodeById.get(item.id)?.type === 'file')?.id || null;
  const adjacency = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    if ((edge.type === 'imports' || edge.type === 'calls') && nodeById.has(edge.source) && nodeById.has(edge.target)) {
      adjacency.get(edge.source).push(edge.target);
    }
  }
  const order = [];
  const depthMap = {};
  const byDepth = {};
  if (topCodeEntry) {
    const queue = [topCodeEntry];
    depthMap[topCodeEntry] = 0;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      order.push(current);
      const depth = depthMap[current];
      (byDepth[depth] ||= []).push(current);
      for (const next of adjacency.get(current) || []) {
        if (!(next in depthMap)) {
          depthMap[next] = depth + 1;
          queue.push(next);
        }
      }
    }
  }

  const compact = (node) => ({ id: node.id, name: node.name, type: node.type, summary: node.summary || '' });
  const nonCodeFiles = {
    documentation: nodes.filter((node) => node.type === 'document').map(compact),
    infrastructure: nodes.filter((node) => ['service', 'pipeline', 'resource'].includes(node.type)).map(compact),
    data: nodes.filter((node) => ['table', 'schema', 'endpoint'].includes(node.type)).map(compact),
    config: nodes.filter((node) => node.type === 'config').map(compact),
  };

  const bidirectionalPairs = [];
  const relation = new Set(edges
    .filter((edge) => ['imports', 'calls'].includes(edge.type) && nodeById.has(edge.source) && nodeById.has(edge.target))
    .map((edge) => `${edge.source}\u0000${edge.target}\u0000${edge.type}`));
  for (const edge of edges) {
    if (!['imports', 'calls'].includes(edge.type) || !nodeById.has(edge.source) || !nodeById.has(edge.target)) continue;
    if (edge.source < edge.target && relation.has(`${edge.target}\u0000${edge.source}\u0000${edge.type}`)) {
      bidirectionalPairs.push(new Set([edge.source, edge.target]));
    }
  }
  const clusters = [];
  for (const seed of bidirectionalPairs) {
    const cluster = new Set(seed);
    let changed = true;
    while (changed && cluster.size < 5) {
      changed = false;
      for (const node of nodes) {
        if (cluster.has(node.id)) continue;
        let connections = 0;
        for (const member of cluster) {
          if ([...relation].some((key) => key.startsWith(`${node.id}\u0000${member}\u0000`) || key.startsWith(`${member}\u0000${node.id}\u0000`))) connections += 1;
        }
        if (connections >= 2) { cluster.add(node.id); changed = true; if (cluster.size >= 5) break; }
      }
    }
    const ids = [...cluster].sort();
    if (!clusters.some((existing) => existing.nodes.every((id) => cluster.has(id)))) {
      const edgeCount = edges.filter((edge) => cluster.has(edge.source) && cluster.has(edge.target)).length;
      clusters.push({ nodes: ids, edgeCount });
    }
  }
  clusters.sort((a, b) => b.edgeCount - a.edgeCount || b.nodes.length - a.nodes.length);

  const nodeSummaryIndex = Object.fromEntries(nodes.map((node) => [node.id, {
    name: node.name, type: node.type, summary: node.summary || ''
  }]));
  const result = {
    scriptCompleted: true,
    entryPointCandidates,
    fanInRanking,
    fanOutRanking,
    bfsTraversal: { startNode: topCodeEntry, order, depthMap, byDepth },
    nonCodeFiles,
    clusters: clusters.slice(0, 10),
    layers: { count: layers.length, list: layers.map(({ id, name, description }) => ({ id, name, description })) },
    nodeSummaryIndex,
    totalNodes: nodes.length,
    totalEdges: edges.length,
  };
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
} catch (error) {
  fail(error);
}
