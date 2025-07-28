const axios = require('axios');
require('dotenv').config();

const api = axios.create({
  baseURL: process.env.UAZAPI_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
});

async function criarInstancia(nome) {
  const res = await api.post('/instance/init', {
    name: nome,
    systemName: 'apilocal',
    adminField01: 'custom-metadata-1',
    adminField02: 'custom-metadata-2'
  }, {
    headers: {
      admintoken: process.env.ADMIN_TOKEN
    }
  });
  return res.data;
}

async function conectarInstancia(token) {
  const res = await api.post('/instance/connect', {}, {
    headers: { token }
  });
  return res.data;
}


async function checarStatusInstancia(token) {
  const res = await api.get(`/instance/status?t=${Date.now()}`, {
    headers: {
      token,
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });
  return res.data;
}


async function enviarTexto(token, numero, texto) {
  const res = await api.post('/send/text', {
    number: numero,
    text: texto
  }, {
    headers: { token }
  });
  return res.data;
}

async function enviarMidia(token, numero, file, legenda) {
  const res = await api.post('/send/media', {
    number: numero,
    type: 'image',
    file: file,
    text: legenda
  }, {
    headers: { token }
  });
  return res.data;
}

async function envioEmMassa(token, payload) {
  const res = await axios.post('https://testenardini.uazapi.com/sender/simple', payload, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      token
    }
  });
  return res.data;
}

module.exports = {
  criarInstancia,
  conectarInstancia,
  checarStatusInstancia,
  enviarTexto,
  enviarMidia,
  envioEmMassa
};
