require('dotenv').config(); // Sempre primeiro para carregar variáveis do .env

const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const axios = require('axios');
// Importações primeiro
const {
  carregarArquivo,
  salvarArquivo,
  paths,
  salvarInstancias,
  salvarHistorico
} = require('./utils/persistencia');

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
const PORT = 3000;
const statusMensagens = []; // (ou use Map/objeto se quiser por token/id depois)

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.get('/', async (req, res) => {
  try {
    const url = process.env.UAZAPI_BASE_URL + '/instance/all';
    const adminToken = process.env.ADMIN_TOKEN;

    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'admintoken': adminToken
      }
    });


      const usuariosConectados = response.data.map(inst => ({
        token: inst.token,
        numeroConectado: inst.owner || 'Não conectado',
        instanceName: inst.name || inst.systemName || '(sem nome)',
        nomeWhatsapp: inst.profileName || '-',
        status: inst.status 
      }));
    res.render('index', { usuariosConectados , uazapiBaseUrl: process.env.UAZAPI_BASE_URL});

  } catch (err) {
    console.error('Erro ao buscar instâncias UAZAPI:', err.message);
    const dadosInstancias = carregarArquivo(paths.instancias);
    const usuariosConectados = Object.entries(dadosInstancias).map(([token, obj]) => ({
      token,
      numeroConectado: obj.number || 'Não conectado',
      instanceName: obj.instanceName || ''
    }));
    res.render('index', { usuariosConectados });
  }
});

app.post('/init', async (req, res) => {
  try {
    const { nome } = req.body;
    let dadosInstancias = carregarArquivo(paths.instancias) || {};

    let tokenExistente = Object.keys(dadosInstancias).find(token => dadosInstancias[token].instanceName === nome);

    // Função para buscar status real da instância via API UAZAPI
    async function getStatusApi(token) {
      const resp = await axios.get(
        process.env.UAZAPI_BASE_URL + '/instance/status',
        { headers: { token } }
      );
      // Resposta real do UAZAPI tem .instance.status
      return resp.data && resp.data.instance && resp.data.instance.status
        ? resp.data.instance.status
        : null;
    }

    if (tokenExistente) {
      // Pega status real pela API, não pelo arquivo
      const statusReal = await getStatusApi(tokenExistente);
      const numeroConectado = dadosInstancias[tokenExistente].number || "Não conectado";
      if (statusReal === 'connected') {
        return res.render('disparo', { token: tokenExistente, numeroConectado });
      } else {
        return res.redirect(`/connect?token=${tokenExistente}&name=${nome}`);
      }
    }

    // Cria nova instância normalmente
    const data = await criarInstancia(nome);
    const token = data.token;

    dadosInstancias[token] = { instanceName: nome, number: null };
    salvarArquivo(paths.instancias, dadosInstancias);

    // Depois de criar, pega status real da API também
    const statusApi = await getStatusApi(token);
    let numeroConectado = "Não conectado";

    // Se owner já estiver disponível (pode não estar logo após criar)
    if (statusApi === 'connected') {
      const resp = await axios.get(
        process.env.UAZAPI_BASE_URL + '/instance/status',
        { headers: { token } }
      );
      if (resp.data.instance?.owner) {
        dadosInstancias[token].number = resp.data.instance.owner;
        salvarArquivo(paths.instancias, dadosInstancias);
        numeroConectado = resp.data.instance.owner;
      }
      return res.render('disparo', { token, numeroConectado });
    } else {
      return res.redirect(`/connect?token=${token}&name=${nome}`);
    }

  } catch (e) {
    res.status(500).send('Erro ao criar/conectar instância: ' + e.message);
  }
});

// Cria 300 instâncias com nomes b2list-1 ... b2list-300
app.post('/mass-create', async (req, res) => {
  try {
    for(let i = 1; i <= 300; i++) {
      const nome = `b2list-${i}`;
      let dadosInstancias = carregarArquivo(paths.instancias) || {};
      let existe = Object.values(dadosInstancias).find(obj => obj.instanceName === nome);
      if (existe) continue;
      await criarInstancia(nome);
    }
    res.send('300 instâncias criadas (ou já existiam)!');
  } catch (e) {
    res.status(500).send('Erro ao criar instâncias em massa: ' + e.message);
  }
});

// Deleta TODAS as instâncias registradas (cuidado!)
app.delete('/mass-delete', async (req, res) => {
  try {
    const dadosInstancias = carregarArquivo(paths.instancias) || {};
    const tokens = Object.keys(dadosInstancias);
    for(const token of tokens) {
      try {
        await fetch(process.env.UAZAPI_BASE_URL + '/instance', {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
            token
          }
        });
      } catch {}
    }
    // Limpa o arquivo local também!
    salvarArquivo(paths.instancias, {});
    res.send('Todas as instâncias deletadas!');
  } catch (e) {
    res.status(500).send('Erro ao deletar todas: ' + e.message);
  }
});



app.post('/instance/disconnect', async (req, res) => {
  try {
    const { token } = req.body;
    const response = await axios.post(
      process.env.UAZAPI_BASE_URL + '/instance/disconnect',
      {},
      { headers: { token } }
    );
    res.json({ success: true, result: response.data });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Erro ao desconectar instância' });
  }
});

app.get('/connect', async (req, res) => {
  try {
    const { token, name } = req.query;

    let status = await checarStatusInstancia(token);

    if (status.instance?.status === 'disconnected') {
      await conectarInstancia(token);
      await new Promise(r => setTimeout(r, 1200));
      status = await checarStatusInstancia(token);
    }

    const qrcode = status.instance?.qrcode || null;

    const dadosInstancias = carregarArquivo(paths.instancias);
    const usuariosConectados = Object.entries(dadosInstancias).map(([token, data]) => ({
      token,
      numeroConectado: data.number || "Não conectado",
      instanceName: data.instanceName
    }));

    if (status.connected || (status.instance && status.instance.status === 'connected')) {
      res.redirect(`/disparo?token=${token}`);
    } else {
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
      messageId: resposta.messageid || resposta.messageId || null, // 👈 salva o id
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
      messageId: null, // não tem id em erro
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

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

app.post('/webhook', express.json(), (req, res) => {
  const evento = req.body;

  // LOG PRINCIPAL DO WEBHOOK - imprime tudo em detalhes
  console.log('\n[WEBHOOK] NOVO EVENTO RECEBIDO:');
  console.log(JSON.stringify(evento, null, 2)); // loga o objeto inteiro

  // Log dos campos principais para leitura rápida
  console.log('→ EventType:', evento.EventType);
  console.log('→ type:', evento.type);
  console.log('→ token:', evento.token?.slice?.(0, 8) + '...' || evento.token);
  if (evento.event?.MessageIDs) {
    console.log('→ MessageIDs:', evento.event.MessageIDs.join(', '));
  }

  // Só tenta atualizar status se state for válido e não vazio
  const estado = evento.state || evento.event?.State;
  if (
    evento.EventType === "messages_update" &&
    evento.type === "ReadReceipt" &&
    Array.isArray(evento.event.MessageIDs) &&
    estado && estado !== "undefined" && estado !== ""
  ) {
    const token = evento.token;
    const messageIds = evento.event.MessageIDs;

    const historico = historicoDisparos.get(token) || [];
    let atualizou = false;
    let atualizadas = [];

    messageIds.forEach(id => {
      const msg = historico.find(d => d.messageId === id);
      if (msg) {
        msg.status = estado; // só atualiza se o estado for válido
        msg.statusTimestamp = evento.event.Timestamp;
        atualizou = true;
        atualizadas.push(id);
      }
    });

    if (atualizou) {
      salvarHistorico(historicoDisparos);
      console.log(`[WEBHOOK] Mensagens atualizadas: ${atualizadas.join(', ')} | Novo status: ${estado}`);
    } else {
      console.log('[WEBHOOK] Nenhuma mensagem do histórico foi encontrada para atualizar.');
    }
  } else {
    if (!estado || estado === "undefined" || estado === "") {
      console.warn('[WEBHOOK] Estado do evento ("state") veio vazio ou indefinido, status não atualizado!');
    } else {
      console.log('[WEBHOOK] Evento não é de ReadReceipt messages_update, ignorado.');
    }
  }

  res.status(200).json({ ok: true });
});

