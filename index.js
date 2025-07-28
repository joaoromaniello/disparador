require('dotenv').config(); // Sempre primeiro para carregar variáveis do .env

const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');

// Importações primeiro
const {
  carregarArquivo,
  salvarArquivo,
  paths,
  salvarInstancias,
  salvarHistorico
} = require('./utils/persistencia');

// Inicialização segura dos Maps
const dadosInstancias = carregarArquivo(paths.instancias) || {};
const instanciaCache = new Map(Object.entries(dadosInstancias));

const dadosHistorico = carregarArquivo(paths.historico) || {};
const historicoDisparos = new Map(
  Object.entries(dadosHistorico).map(([token, disparos]) => [token, disparos])
);

// Importação dos serviços
const {
  criarInstancia,
  conectarInstancia,
  checarStatusInstancia,
  enviarTexto,
  enviarMidia,
  envioEmMassa
} = require('./services/uazapi');
const { SourceTextModule } = require('vm');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
  const dadosInstancias = carregarArquivo(paths.instancias);
  const usuariosConectados = Object.entries(dadosInstancias).map(([token, obj]) => ({
    token,
    numeroConectado: obj.number || 'Não conectado',
    instanceName: obj.instanceName || ''
  }));
  res.render('index', { usuariosConectados });
});

app.post('/init', async (req, res) => {
  try {
    const { nome } = req.body;
    let dadosInstancias = carregarArquivo(paths.instancias) || {};

    let tokenExistente = Object.keys(dadosInstancias).find(token => dadosInstancias[token].instanceName === nome);

    if (tokenExistente) {
      const status = await checarStatusInstancia(tokenExistente);
      const numeroConectado = dadosInstancias[tokenExistente].number || "Não conectado";
      if (status.instance?.status === 'connected') {
        return res.render('disparo', { token: tokenExistente, numeroConectado });
      } else {
        return res.redirect(`/connect?token=${tokenExistente}&name=${nome}`);
      }
    }

    // Cria nova instância
    const data = await criarInstancia(nome);
    const token = data.token;

    // Salva no novo formato
    dadosInstancias[token] = { instanceName: nome, number: null };
    salvarArquivo(paths.instancias, dadosInstancias);

    const status = await checarStatusInstancia(token);
    let numeroConectado = "Não conectado";
    if (status.instance?.owner) {
      dadosInstancias[token].number = status.instance.owner;
      salvarArquivo(paths.instancias, dadosInstancias);
      numeroConectado = status.instance.owner;
    }

    if (status.instance?.status === 'connected') {
      return res.render('disparo', { token, numeroConectado });
    } else {
      return res.redirect(`/connect?token=${token}&name=${nome}`);
    }
  } catch (e) {
    res.status(500).send('Erro ao criar/conectar instância: ' + e.message);
  }
});



app.get('/connect', async (req, res) => {
  try {
    const { token, name } = req.query;
    const conexao = await conectarInstancia(token);
    const status = await checarStatusInstancia(token);

    const dadosInstancias = carregarArquivo(paths.instancias); // token -> {number, instanceName}
    const usuariosConectados = Object.entries(dadosInstancias).map(([token, data]) => ({
      token,
      numeroConectado: data.number || "Não conectado",
      instanceName: data.instanceName
    }));

    if (status.connected) {
      res.redirect(`/disparo?token=${token}`);
    } else {
      const qrcode = conexao.qrcode || (conexao.instance && conexao.instance.qrcode) || null;
      res.render('connect', { token, name, qrcode, usuariosConectados });
    }
  } catch (e) {
    res.status(500).send('Erro ao conectar: ' + e.message);
  }
});


app.get('/instance/status', async (req, res) => {
  try {
    const { token } = req.query;
    const status = await checarStatusInstancia(token);
    const connected = status.instance?.status === 'connected';

     if (connected && status.instance?.owner) {
        const dadosPersist = carregarArquivo(paths.instancias);
        dadosPersist[token] = status.instance.owner; 
        salvarArquivo(paths.instancias, dadosPersist);
    }

       res.json({
      connected
    });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

app.get('/disparo', (req, res) => {
  const { token } = req.query;
  const dadosInstancias = carregarArquivo(paths.instancias);
  const numeroConectado = dadosInstancias[token]?.number || "Não conectado";
  console.log(numeroConectado)
  res.render('disparo', { token, numeroConectado });
});

function detectaTemplate(text) {
  if (text.includes("Bebidas")) return "bebidas";
  if (text.includes("Carnes")) return "carnes";
  return "manual";
}

app.get('/:token/disparos', (req, res) => {
  const { token } = req.params;
  const lista = historicoDisparos.get(token) || [];
  res.render('disparos', { token, disparos: lista ,numeroConectado: carregarArquivo(paths.instancias)[token] || "Não conectado" });
});

app.post('/disparo/texto', async (req, res) => {
  try {
    const { token, number, text } = req.body;
    const resposta = await enviarTexto(token, number, text);

    if (!historicoDisparos.has(token)) historicoDisparos.set(token, []);

    historicoDisparos.get(token).push({
      number,
      tipo: 'texto',
      template: detectaTemplate(text),
      status: 'enviado',
      messageId: resposta.messageid || null,
      timestamp: new Date().toISOString()
    });

    salvarHistorico(historicoDisparos);

    const numeroDestino = resposta.chatid.split('@')[0];
    const idMensagem = resposta.id;

    res.json({
      success: true,
      message: 'Mensagem enviada com sucesso!',
      data: {
        recipient: numeroDestino,
        messageId: idMensagem
      }
    });

  } catch (e) {
    const { token, number, text } = req.body;
    if (!historicoDisparos.has(token)) historicoDisparos.set(token, []);
    historicoDisparos.get(token).push({
      number,
      tipo: 'texto',
      template: detectaTemplate(text),
      status: 'erro',
      messageId: null,
      errorMessage: e.message,
      timestamp: new Date().toISOString()
    });

    salvarHistorico(historicoDisparos);

    res.status(500).json({ error: e.message || 'Erro ao enviar texto' });
  }
});


app.post('/disparo/midia', async (req, res) => {
  try {
    const { token, number, file, text } = req.body;
    const resposta = await enviarMidia(token, number, file, text);

    if (!historicoDisparos.has(token)) historicoDisparos.set(token, []);

    historicoDisparos.get(token).push({
      number,
      tipo: 'midia',
      template: 'imagem_manual',
      status: 'enviado',
      file,
      legenda: text,
      timestamp: new Date().toISOString()
    });

    salvarHistorico(historicoDisparos);

    res.json({
      success: true,
      message: 'Mídia enviada com sucesso!',
      data: resposta
    });

  } catch (e) {
    // Salva como erro no histórico
    const { token, number, file, text } = req.body;
    if (!historicoDisparos.has(token)) historicoDisparos.set(token, []);
    historicoDisparos.get(token).push({
      number,
      tipo: 'midia',
      template: 'imagem_manual',
      status: 'erro',
      file,
      legenda: text,
      errorMessage: e.message,
      timestamp: new Date().toISOString()
    });

    salvarHistorico(historicoDisparos);

    res.status(500).json({ error: e.message || 'Erro ao enviar mídia' });
  }
});


app.post('/disparo/massa', async (req, res) => {
  try {
    const { token, payload } = req.body;
    const resposta = await envioEmMassa(token, payload);

    if (!historicoDisparos.has(token)) historicoDisparos.set(token, []);

    const texto = payload.text;
    const numbers = payload.numbers || [];

    numbers.forEach(n => {
      historicoDisparos.get(token).push({
        number: n.replace('@s.whatsapp.net', ''),
        tipo: 'massa',
        template: detectaTemplate(texto),
        status: 'enfileirado',
        text: texto,
        scheduled_for: payload.scheduled_for || null,
        timestamp: new Date().toISOString()
      });
    });

    salvarHistorico(historicoDisparos); // 👈 atualizado

    res.send('Envio em massa feito: ' + JSON.stringify(resposta));
  } catch (e) {
    res.status(500).send('Erro no disparo em massa: ' + e.message);
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

const statusMensagens = []; // (ou use Map/objeto se quiser por token/id depois)

app.post('/webhook', express.json(), (req, res) => {
  const evento = req.body;

  if (
    evento.EventType === "messages_update" &&
    evento.type === "ReadReceipt" &&
    Array.isArray(evento.event.MessageIDs)
  ) {
    const token = evento.token;
    const messageIds = evento.event.MessageIDs;

    // Para cada ID recebido, atualize o histórico desse token
    const historico = historicoDisparos.get(token) || [];
    let atualizou = false;

    messageIds.forEach(id => {
      // Procura mensagem com esse messageId e atualiza status
      const msg = historico.find(d => d.messageId === id);
      if (msg) {
        msg.status = evento.state; // 'Delivered', 'Read', etc
        msg.statusTimestamp = evento.event.Timestamp;
        atualizou = true;
      }
    });

    if (atualizou) salvarHistorico(historicoDisparos);
  }

  res.status(200).json({ ok: true });
});
