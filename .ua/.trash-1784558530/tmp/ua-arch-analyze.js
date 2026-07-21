const fs = require('fs');
const path = require('path');

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error('Usage: node ua-arch-analyze.js <input.json> <output.json>');
  process.exit(1);
}

const normalize = (value) => (value || '').replace(/\\/g, '/');

function commonDirectoryPrefix(filePaths) {
  const directoryParts = filePaths.map((filePath) => {
    const parts = normalize(filePath).split('/');
    return parts.slice(0, -1);
  });
  if (!directoryParts.length) return [];
  const prefix = [];
  const shortest = Math.min(...directoryParts.map((parts) => parts.length));
  for (let i = 0; i < shortest; i += 1) {
    const segment = directoryParts[0][i];
    if (!directoryParts.every((parts) => parts[i] === segment)) break;
    prefix.push(segment);
  }
  return prefix;
}

function flatPattern(filePath) {
  const name = path.posix.basename(normalize(filePath)).toLowerCase();
  if (/\.(test|spec)\.[^.]+$/.test(name)) return 'test';
  if (/config/.test(name)) return 'config';
  const extension = path.posix.extname(name).slice(1);
  return extension || 'root';
}

function groupName(filePath, prefix, isFlat) {
  const parts = normalize(filePath).split('/');
  if (isFlat) return flatPattern(filePath);
  const rest = parts.slice(prefix.length);
  return rest.length > 1 ? rest[0] : 'root';
}

function directoryPattern(group) {
  const map = {
    routes: 'api', api: 'api', controllers: 'api', endpoints: 'api', handlers: 'api',
    services: 'service', core: 'service', lib: 'service', domain: 'service', logic: 'service',
    models: 'data', db: 'data', data: 'data', persistence: 'data', repository: 'data', entities: 'data',
    components: 'ui', views: 'ui', pages: 'ui', ui: 'ui', layouts: 'ui', screens: 'ui',
    middleware: 'middleware', plugins: 'middleware', interceptors: 'middleware', guards: 'middleware',
    utils: 'utility', helpers: 'utility', common: 'utility', shared: 'utility', tools: 'utility',
    config: 'config', constants: 'config', env: 'config', settings: 'config',
    __tests__: 'test', test: 'test', tests: 'test', spec: 'test', specs: 'test',
    types: 'types', interfaces: 'types', schemas: 'types', contracts: 'types', dtos: 'types',
    hooks: 'hooks', store: 'state', stores: 'state', state: 'state', reducers: 'state', actions: 'state', slices: 'state',
    assets: 'assets', static: 'assets', public: 'assets', migrations: 'data',
    management: 'config', commands: 'config', templatetags: 'utility', signals: 'service', serializers: 'api',
    cmd: 'entry', internal: 'service', pkg: 'utility', dto: 'types', request: 'types', response: 'types',
    entity: 'data', controller: 'api', routers: 'api', composables: 'service', blueprints: 'api',
    mailers: 'service', jobs: 'service', channels: 'service', bin: 'entry', docs: 'documentation',
    documentation: 'documentation', wiki: 'documentation', deploy: 'infrastructure', deployment: 'infrastructure',
    infra: 'infrastructure', infrastructure: 'infrastructure', '.github': 'ci-cd', '.gitlab': 'ci-cd',
    '.circleci': 'ci-cd', k8s: 'infrastructure', kubernetes: 'infrastructure', helm: 'infrastructure',
    charts: 'infrastructure', terraform: 'infrastructure', tf: 'infrastructure', docker: 'infrastructure',
    sql: 'data', database: 'data', schema: 'data',
  };
  return map[group.toLowerCase()] || null;
}

function filePattern(filePath) {
  const normalized = normalize(filePath);
  const name = path.posix.basename(normalized);
  const lower = name.toLowerCase();
  if (/\.(test|spec)\.[^.]+$/.test(lower) || /^test_.*\.py$/.test(lower) || /_test\.go$/.test(lower) || /test\.java$/.test(lower) || /_spec\.rb$/.test(lower) || /test\.php$/.test(lower) || /tests\.cs$/.test(lower)) return 'test';
  if (/\.d\.ts$/.test(lower)) return 'types';
  if (/\.github\/workflows\//.test(`/${normalized}`) || lower === '.gitlab-ci.yml' || name === 'Jenkinsfile') return 'ci-cd';
  if (lower === 'dockerfile' || /^docker-compose\./.test(lower) || /\.tf(vars)?$/.test(lower) || name === 'Makefile') return 'infrastructure';
  if (/\.sql$/.test(lower)) return 'data';
  if (/\.(graphql|gql|proto)$/.test(lower)) return 'types';
  if (/\.(md|rst)$/.test(lower)) return 'documentation';
  if (['cargo.toml', 'go.mod', 'gemfile', 'pom.xml', 'build.gradle', 'composer.json'].includes(lower)) return 'config';
  if (['wsgi.py', 'asgi.py'].includes(lower)) return 'config';
  if (lower === 'manage.py' && !normalized.includes('/')) return 'entry';
  if (lower === 'config.ru' || lower === 'application.java' || lower === 'program.cs') return 'entry';
  if ((lower === 'index.ts' || lower === 'index.js' || lower === '__init__.py') && normalized.includes('/')) return 'entry';
  if ((lower === 'main.rs' || lower === 'lib.rs') && path.posix.dirname(normalized) === 'src') return 'entry';
  if (lower === 'main.go' && normalized.startsWith('cmd/')) return 'entry';
  return null;
}

try {
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const nodes = input.fileNodes || [];
  const imports = input.importEdges || [];
  const allEdges = input.allEdges || [];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const prefix = commonDirectoryPrefix(nodes.map((node) => node.filePath));
  const isFlat = nodes.every((node) => !normalize(node.filePath).includes('/'));
  const directoryGroups = {};
  const groupById = new Map();
  for (const node of nodes) {
    const group = groupName(node.filePath, prefix, isFlat);
    (directoryGroups[group] ||= []).push(node.id);
    groupById.set(node.id, group);
  }
  for (const ids of Object.values(directoryGroups)) ids.sort();

  const nodeTypeGroups = {};
  for (const node of nodes) (nodeTypeGroups[node.type] ||= []).push(node.id);
  for (const ids of Object.values(nodeTypeGroups)) ids.sort();

  const fileFanIn = Object.fromEntries(nodes.map((node) => [node.id, 0]));
  const fileFanOut = Object.fromEntries(nodes.map((node) => [node.id, 0]));
  const groupImportsFrom = {};
  const groupImportedBy = {};
  const pairCounts = new Map();
  for (const edge of imports) {
    fileFanOut[edge.source] += 1;
    fileFanIn[edge.target] += 1;
    const from = groupById.get(edge.source);
    const to = groupById.get(edge.target);
    if (!from || !to) continue;
    (groupImportsFrom[from] ||= new Set()).add(to);
    (groupImportedBy[to] ||= new Set()).add(from);
    const key = `${from}\u0000${to}`;
    pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
  }

  const directoryAdjacency = {};
  for (const group of Object.keys(directoryGroups)) {
    directoryAdjacency[group] = {
      importsFrom: [...(groupImportsFrom[group] || [])].sort(),
      importedBy: [...(groupImportedBy[group] || [])].sort(),
    };
  }

  const crossCounts = new Map();
  for (const edge of allEdges) {
    const fromType = nodeById.get(edge.source)?.type;
    const toType = nodeById.get(edge.target)?.type;
    if (!fromType || !toType || fromType === toType) continue;
    const key = `${fromType}\u0000${toType}\u0000${edge.type}`;
    crossCounts.set(key, (crossCounts.get(key) || 0) + 1);
  }
  const crossCategoryEdges = [...crossCounts].map(([key, count]) => {
    const [fromType, toType, edgeType] = key.split('\u0000');
    return { fromType, toType, edgeType, count };
  }).sort((a, b) => b.count - a.count || a.fromType.localeCompare(b.fromType));

  const interGroupImports = [...pairCounts]
    .filter(([key]) => {
      const [from, to] = key.split('\u0000');
      return from !== to;
    })
    .map(([key, count]) => {
      const [from, to] = key.split('\u0000');
      return { from, to, count };
    })
    .sort((a, b) => b.count - a.count || a.from.localeCompare(b.from));

  const intraGroupDensity = {};
  for (const group of Object.keys(directoryGroups)) {
    let internalEdges = 0;
    let totalEdges = 0;
    for (const edge of imports) {
      const from = groupById.get(edge.source);
      const to = groupById.get(edge.target);
      if (from === group || to === group) totalEdges += 1;
      if (from === group && to === group) internalEdges += 1;
    }
    intraGroupDensity[group] = {
      internalEdges,
      totalEdges,
      density: totalEdges ? Number((internalEdges / totalEdges).toFixed(4)) : 0,
    };
  }

  const patternMatches = {};
  for (const group of Object.keys(directoryGroups)) {
    const match = directoryPattern(group);
    if (match) patternMatches[group] = match;
  }
  const filePatternMatches = {};
  for (const node of nodes) {
    const match = filePattern(node.filePath);
    if (match) filePatternMatches[node.id] = match;
  }

  const paths = nodes.map((node) => normalize(node.filePath));
  const infraFiles = paths.filter((filePath) => {
    const lower = filePath.toLowerCase();
    return /(^|\/)dockerfile($|\.)/.test(lower) || /docker-compose\./.test(lower) || /\.(tf|tfvars)$/.test(lower) || /(^|\/)(k8s|kubernetes|helm|charts)\//.test(lower) || /(^|\/)\.github\/workflows\//.test(lower) || lower === '.gitlab-ci.yml' || lower.endsWith('/jenkinsfile') || lower === 'jenkinsfile';
  });
  const deploymentTopology = {
    hasDockerfile: paths.some((p) => /(^|\/)dockerfile($|\.)/i.test(p)),
    hasCompose: paths.some((p) => /(^|\/)docker-compose\./i.test(p)),
    hasK8s: paths.some((p) => /(^|\/)(k8s|kubernetes|helm|charts)\//i.test(p)),
    hasTerraform: paths.some((p) => /\.(tf|tfvars)$/i.test(p)),
    hasCI: paths.some((p) => /(^|\/)\.github\/workflows\//i.test(p) || /(^|\/)\.gitlab-ci\.yml$/i.test(p) || /(^|\/)jenkinsfile$/i.test(p)),
    infraFiles: infraFiles.sort(),
  };

  const dataPipeline = {
    schemaFiles: paths.filter((p) => /(^|\/)(schema[^/]*\.(sql|graphql|gql|proto|prisma))$/i.test(p) || /\.(graphql|gql|proto|prisma)$/i.test(p)).sort(),
    migrationFiles: paths.filter((p) => /(^|\/)migrations?\//i.test(p)).sort(),
    dataModelFiles: nodes.filter((node) => /(^|\/)(models?|entities|repository|data)\//i.test(normalize(node.filePath)) || (node.tags || []).some((tag) => /model|data-access|repository/i.test(tag))).map((node) => normalize(node.filePath)).sort(),
    apiHandlerFiles: nodes.filter((node) => /(^|\/)app\/api\/.+\/route\.[jt]sx?$/i.test(normalize(node.filePath)) || (node.tags || []).includes('api-handler')).map((node) => normalize(node.filePath)).sort(),
  };

  const documentNodes = nodes.filter((node) => node.type === 'document' || /\.(md|rst)$/i.test(node.filePath));
  const groupsWithDocsSet = new Set();
  for (const doc of documentNodes) {
    const docPath = normalize(doc.filePath).toLowerCase();
    const ownGroup = groupById.get(doc.id);
    if (ownGroup) groupsWithDocsSet.add(ownGroup);
    const searchable = `${doc.summary || ''} ${(doc.tags || []).join(' ')}`.toLowerCase();
    for (const group of Object.keys(directoryGroups)) {
      if (docPath.includes(`/${group.toLowerCase()}/`) || searchable.includes(group.toLowerCase())) groupsWithDocsSet.add(group);
    }
  }
  const allGroups = Object.keys(directoryGroups);
  const docCoverage = {
    groupsWithDocs: groupsWithDocsSet.size,
    totalGroups: allGroups.length,
    coverageRatio: allGroups.length ? Number((groupsWithDocsSet.size / allGroups.length).toFixed(4)) : 0,
    undocumentedGroups: allGroups.filter((group) => !groupsWithDocsSet.has(group)).sort(),
  };

  const dependencyDirection = [];
  const compared = new Set();
  for (const { from, to } of interGroupImports) {
    const pair = [from, to].sort().join('\u0000');
    if (compared.has(pair)) continue;
    compared.add(pair);
    const forward = pairCounts.get(`${from}\u0000${to}`) || 0;
    const reverse = pairCounts.get(`${to}\u0000${from}`) || 0;
    if (forward > reverse) dependencyDirection.push({ dependent: from, dependsOn: to });
    else if (reverse > forward) dependencyDirection.push({ dependent: to, dependsOn: from });
    else dependencyDirection.push({ dependent: from, dependsOn: to, bidirectional: true });
  }

  const output = {
    scriptCompleted: true,
    commonDirectoryPrefix: prefix.join('/'),
    directoryGroups,
    nodeTypeGroups,
    directoryAdjacency,
    crossCategoryEdges,
    interGroupImports,
    intraGroupDensity,
    patternMatches,
    filePatternMatches,
    deploymentTopology,
    dataPipeline,
    docCoverage,
    dependencyDirection,
    fileStats: {
      totalFileNodes: nodes.length,
      filesPerGroup: Object.fromEntries(Object.entries(directoryGroups).map(([group, ids]) => [group, ids.length])),
      nodeTypeCounts: Object.fromEntries(Object.entries(nodeTypeGroups).map(([type, ids]) => [type, ids.length])),
    },
    fileFanIn,
    fileFanOut,
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
