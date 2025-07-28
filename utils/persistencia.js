const fs = require('fs');
const path = require('path');

const paths = {
  instancias: path.join(__dirname, '../data/instancias.json'),
  historico: path.join(__dirname, '../data/historico.json')
};

function carregarArquivo(caminho) {
  try {
    if (!fs.existsSync(caminho)) return {};
    const raw = fs.readFileSync(caminho, 'utf-8');
    if (!raw.trim()) return {};
    return JSON.parse(raw) || {}; // <- adicionado "|| {}"
  } catch (e) {
    console.error('Erro ao carregar JSON:', caminho, e);
    return {};  // garante que retorne objeto vazio, nunca undefined
  }
}

function salvarArquivo(caminho, conteudo) {
  try {
    fs.writeFileSync(caminho, JSON.stringify(conteudo, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erro ao salvar JSON:', caminho, e);
  }
}

function salvarInstancias(instanciaCache) {
  salvarArquivo(paths.instancias, Object.fromEntries(instanciaCache));
}

function salvarHistorico(historicoDisparos) {
  salvarArquivo(paths.historico, Object.fromEntries(historicoDisparos));
}

module.exports = {
  paths,
  carregarArquivo,
  salvarArquivo,
  salvarInstancias,
  salvarHistorico
};
