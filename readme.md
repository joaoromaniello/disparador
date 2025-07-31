# projeto-uazapi

Aplicação Node.js + Express para **gestão de instâncias e disparo de mensagens WhatsApp** via [UAZAPI](https://docs.uazapi.com/), com front-end administrativo e persistência local em JSON.

---

## 📦 Estrutura do Projeto

projeto-uazapi/
│
├── 📂 data
│   ├── instancias.json       # Armazena tokens das instâncias e dados associados (número, nome)
│   └── historico.json        # Armazena o histórico detalhado de todos os disparos realizados
│
├── 📂 services
│   └── uazapi.js             # Funções de integração com a API UAZAPI (criação, conexão, disparos)
│
├── 📂 utils
│   └── persistencia.js       # Utilitários para ler e salvar arquivos JSON de forma segura/atômica
│
├── 📂 views                  # Templates EJS (HTML dinâmico)
│   ├── index.ejs             # Tela inicial: cria instância, lista todas as existentes
│   ├── connect.ejs           # Tela de conexão QR Code (scan para ativar WhatsApp)
│   ├── disparo.ejs           # Tela de disparo de mensagens (texto e mídia)
│   └── disparos.ejs          # Histórico dos disparos enviados por instância/token
│
├── index.js                  # App principal (servidor Express, rotas, integrações)
├── package.json              # Dependências, scripts e metadados do projeto
├── package-lock.json         # Travamento exato das dependências instaladas
└── .env                      # Variáveis de ambiente/senhas (NÃO versionar em produção)

---

## 🔗 Fluxo e Funcionalidades Principais

- **index.js**  
  Arquivo principal. Sobe o servidor Express, expõe as rotas web, faz o controle dos arquivos JSON, integra com a UAZAPI e renderiza as páginas dinâmicas via EJS.

- **data/instancias.json**  
  Guarda todas as instâncias criadas localmente, no formato:
  {
    "token1": { "instanceName": "minha-loja", "number": "5511999999999" },
    "token2": { "instanceName": "lojinha", "number": "5511888888888" }
  }

- **data/historico.json**  
  Para cada token (instância), mantém um array com todos os disparos (data, tipo, número, status, etc), inclusive falhas.

- **services/uazapi.js**  
  Abstrai todas as chamadas HTTP para a UAZAPI: criar instância, conectar (QR Code), enviar mensagem, enviar mídia, disparo em massa, consultar status, deletar/desconectar, etc.

- **utils/persistencia.js**  
  Garante leitura e escrita dos arquivos JSON de modo seguro (evita corrupção, faz lock, parseia e salva atômico).

- **views/**  
  Templates EJS para as páginas administrativas do sistema:
    - **index.ejs** — Lista, cria, deleta, conecta e dispara mensagens pelas instâncias.
    - **connect.ejs** — Exibe o QR code para conexão (scan pelo WhatsApp Business Web).
    - **disparo.ejs** — Tela principal de envio (texto, mídia, massa, agendamento, listas).
    - **disparos.ejs** — Lista o histórico detalhado dos disparos (por instância/token).

---

## 🚦 Principais Rotas/Endpoints

- `GET /`  
  Página inicial. Lista todas as instâncias, permite criar, deletar, conectar e acessar painel de disparos.

- `POST /init`  
  Cria uma nova instância na UAZAPI. Se já existe, redireciona para conexão ou painel de disparos.

- `GET /connect?token=...`  
  Tela para escanear QR code e conectar a instância ao WhatsApp.

- `GET /disparo?token=...`  
  Painel de envio de mensagens, individual ou em massa, incluindo mídia.

- `GET /:token/disparos`  
  Lista histórico de disparos daquele token/instância.

- `POST /disparo/texto`  
  Envia mensagem de texto para um ou vários contatos.

- `POST /disparo/midia`  
  Envia mídia (imagem com legenda).

- `POST /disparo/massa`  
  Disparo em massa para múltiplos contatos.

- `POST /webhook`  
  Endpoint para receber callbacks (webhooks) da UAZAPI — atualiza status de mensagens em tempo real.

- **Endpoints administrativos especiais:**
    - `POST /instance/disconnect` — Desconecta uma instância do WhatsApp.
    - `DELETE /instance` — Remove uma instância da UAZAPI.
    - `POST /mass-create` — Cria 300 instâncias automaticamente (apenas via front especial e senha).
    - `DELETE /mass-delete` — Remove TODAS as instâncias (precaução: pede senha).

---

## 🗝️ Outras Observações

- **Persistência Local**  
  Por padrão os dados são mantidos em JSON no diretório `data/` — perfeito para teste e ambiente controlado. Para produção real, recomende-se banco de dados.

- **Segurança**
    - `.env` nunca deve ser commitado em produção (guarda tokens de admin, URL da API etc).
    - Ações de massa requerem senha e confirmação.

- **Customização**
    - O front é facilmente adaptável, tudo via EJS e CSS custom.
    - Suporte nativo a listas, mensagens rápidas, agendamento de disparo, envio em massa e acompanhamento de status.

---

**Dúvidas ou ajustes? Só pedir!**
Se quiser exemplos de payload, dicas de deploy, proteção de rotas, ou integração mais avançada, só chamar!
