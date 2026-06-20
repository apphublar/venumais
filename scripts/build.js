const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const root = path.resolve(__dirname, '..');
const dist = path.resolve(root, 'dist');
const scriptFiles = [
  'android-frame.jsx',
  'ui.jsx',
  'vendor-screens.jsx',
  'vendor-detail.jsx',
  'vendor-flow.jsx',
  'vendor-auth.jsx',
  'team.jsx',
  'vendas.jsx',
  'produto-form.jsx',
  'cliente-form.jsx',
  'cupom.jsx',
  'notificacoes.jsx',
  'recibo.jsx',
  'pedidos.jsx',
  'client.jsx',
  'app.jsx',
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function compileFile(file) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const result = babel.transformSync(source, {
    filename: file,
    presets: [
      ['@babel/preset-env', { targets: { browsers: ['last 2 versions', '>= 0.25%', 'not dead'] } }],
      '@babel/preset-react',
    ],
    comments: false,
    compact: false,
  });
  if (!result || !result.code) {
    throw new Error(`Erro ao compilar ${file}`);
  }
  return result.code;
}

function copyFile(name) {
  fs.copyFileSync(path.join(root, name), path.join(dist, name));
}

function buildHtml() {
  const htmlPath = path.join(root, 'Gestão de Vendas.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  let output = html
    .replace(/<script src="https:\/\/unpkg\.com\/react@[^"]+"><\/script>\s*/g, '<script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>\n')
    .replace(/<script src="https:\/\/unpkg\.com\/react-dom@[^"]+"><\/script>\s*/g, '<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>\n')
    .replace(/<script src="https:\/\/unpkg\.com\/@babel\/standalone[^"]+"><\/script>\s*/g, '')
    .replace(/<script type="text\/babel" src="[^"]+"><\/script>\s*/g, '');

  output = output.replace(/<script src="data\.js[^>]*><\/script>/, '<script src="data.js"></script>\n    <script src="app.js"></script>');
  output = output.replace(/<title>.*<\/title>/, '<title>Gestão de Vendas — Crediário Digital</title>');
  return output;
}

function run() {
  ensureDir(dist);
  const compiled = scriptFiles.map((file) => compileFile(file)).join('\n\n');
  fs.writeFileSync(path.join(dist, 'app.js'), compiled, 'utf8');
  copyFile('data.js');
  const html = buildHtml();
  fs.writeFileSync(path.join(dist, 'index.html'), html, 'utf8');
  console.log('Build concluído em dist/');
}

run();
