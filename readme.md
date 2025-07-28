projeto-uazapi
│
├── 📂 data
│   ├── 📄 instancias.json      (armazena tokens das instâncias e números conectados)
│   └── 📄 historico.json       (armazena o histórico completo dos disparos feitos)
│
├── 📂 services
│   └── 📄 uazapi.js            (contém as funções para integração direta com a API uazapi)
│
├── 📂 utils
│   └── 📄 persistencia.js      (gerencia a leitura/gravação nos arquivos JSON de forma segura)
│
├── 📂 views                    (templates HTML do projeto)
│   ├── 📄 index.ejs            (tela inicial: criação de instância)
│   ├── 📄 connect.ejs          (tela de conexão via QR Code)
│   ├── 📄 disparo.ejs          (tela para disparar mensagens)
│   └── 📄 disparos.ejs         (tela de visualização dos disparos feitos anteriormente)
│
├── 📄 index.js                 (arquivo principal do projeto - servidor express e rotas)
│
├── 📄 package.json             (dependências, scripts, configurações do projeto)
├── 📄 package-lock.json        (versões exatas das dependências instaladas)
└── 📄 .env                     (variáveis sensíveis ou configuráveis do ambiente)