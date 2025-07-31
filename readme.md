# projeto-uazapi

Aplicação Node.js + Express para **gestão de instâncias e disparo de mensagens WhatsApp** via [UAZAPI](https://docs.uazapi.com/), com front-end administrativo e persistência local em JSON.

---

## 📂 Estrutura de Arquivos

<pre>
projeto-uazapi/
├── 📁 <b>data</b>/
│   ├── 📄 instancias.json  <span style="color:gray"># Armazena dados e tokens das instâncias criadas.</span>
│   └── 📄 historico.json   <span style="color:gray"># Log completo de todos os envios de mensagens.</span>
│
├── 📁 <b>services</b>/
│   └── 📄 uazapi.js        <span style="color:gray"># Módulo de integração com a API UAZAPI.</span>
│
├── 📁 <b>utils</b>/
│   └── 📄 persistencia.js  <span style="color:gray"># Funções para leitura e escrita de arquivos JSON.</span>
│
├── 📁 <b>views</b>/
│   ├── 📄 index.ejs        <span style="color:gray"># Tela inicial para listar e criar instâncias.</span>
│   ├── 📄 connect.ejs      <span style="color:gray"># Página para escanear o QR Code de conexão.</span>
│   ├── 📄 disparo.ejs      <span style="color:gray"># Formulário para envio de mensagens.</span>
│   └── 📄 disparos.ejs     <span style="color:gray"># Tela para visualizar o histórico de envios.</span>
│
├── 📜 <b>index.js</b>             <span style="color:gray"># Ponto de entrada da aplicação (Servidor Express e rotas).</span>
├── 📦 <b>package.json</b>         <span style="color:gray"># Dependências e scripts do projeto.</span>
├── 🗝️ <b>package-lock.json</b>    <span style="color:gray"># Versões exatas das dependências.</span>
└── ⚙️ <b>.env</b>                 <span style="color:gray"># Arquivo de variáveis de ambiente (não versionado).</span>
</pre>

## 🧩 Arquitetura e Componentes Principais

O fluxo da aplicação é orquestrado pelos seguintes componentes:

* `🚀 index.js`
    * **Ponto de Entrada:** Inicializa o servidor Express e orquestra a aplicação.
    * **Roteamento:** Define e gerencia todas as rotas da API.
    * **Controlador:** Integra os serviços da UAZAPI e a persistência de dados.
    * **Renderização:** Utiliza o EJS para renderizar as páginas dinâmicas (`views`).

* `🗃️ data/instancias.json`
    * Armazena os metadados de todas as instâncias criadas. Cada instância é identificada por seu `token`.
    * **Exemplo de estrutura:**
      ```json
      {
        "token-exemplo-1": { "instanceName": "minha-loja", "number": "5511999999999" },
        "token-exemplo-2": { "instanceName": "suporte-cliente", "number": "5511888888888" }
      }
      ```

* `🗃️ data/historico.json`
    * Mantém um log detalhado de todos os disparos, associados a um `token` de instância.
    * Registra informações como data, status do envio (enviado, falhou), destinatário e tipo de mensagem.

* `🛠️ services/uazapi.js`
    * **Camada de Serviço:** Abstrai e centraliza toda a comunicação com a API da UAZAPI.
    * **Funcionalidades:** Inclui métodos para criar instâncias, obter QR Code, enviar mensagens (texto e mídia), realizar disparos em massa e gerenciar o status da conexão.

* `⚙️ utils/persistencia.js`
    * **Utilitário de Dados:** Garante a leitura e escrita segura e atômica dos arquivos JSON (`instancias.json` e `historico.json`), prevenindo a corrupção de dados durante operações concorrentes.

* `🖥️ views/`
    * Contém os templates `EJS` que compõem a interface de administração:
        * **`index.ejs`**: Painel principal para listar, criar e gerenciar todas as instâncias.
        * **`connect.ejs`**: Página dedicada a exibir o QR Code para autenticação da sessão no WhatsApp.
        * **`disparo.ejs`**: Formulário de envio de mensagens (texto, mídia, massa).
        * **`disparos.ejs`**: Interface para visualizar o histórico de envios de uma instância específica.
---

## 🚦 Rotas da API (Endpoints)

A seguir estão as principais rotas expostas pela aplicação.

| Método | Endpoint                    | Descrição                                                                         |
| :----- | :-------------------------- | :-------------------------------------------------------------------------------- |
| `GET`  | `/`                         | **Página Inicial:** Lista todas as instâncias e oferece ações de gerenciamento.     |
| `POST` | `/init`                     | **Criar Instância:** Inicia o processo de criação de uma nova instância na UAZAPI.   |
| `GET`  | `/connect?token=[TOKEN]`    | **Conectar Instância:** Exibe o QR Code para conectar a instância ao WhatsApp.      |
| `GET`  | `/disparo?token=[TOKEN]`    | **Painel de Envio:** Acessa o formulário de disparo para uma instância específica. |
| `GET`  | `/:token/disparos`          | **Histórico de Envios:** Lista todos os disparos realizados pela instância do token. |
| `POST` | `/disparo/texto`            | **Enviar Texto:** Realiza o envio de uma mensagem de texto simples.                 |
| `POST` | `/disparo/midia`            | **Enviar Mídia:** Realiza o envio de uma imagem com legenda.                        |
| `POST` | `/webhook`                  | **Receber Callbacks:** Endpoint para webhooks da UAZAPI (ex: status da mensagem). |

### 🔒 Rotas Administrativas

Estas rotas executam ações sensíveis e possuem mecanismos de segurança.

| Método   | Endpoint              | Descrição                                                                         |
| :------- | :-------------------- | :-------------------------------------------------------------------------------- |
| `POST`   | `/instance/disconnect`| Desconecta a sessão do WhatsApp de uma instância, sem removê-la.                |
| `DELETE` | `/instance`           | **Ação Destrutiva:** Remove permanentemente uma instância da UAZAPI.            |
| `POST`   | `/mass-create`        | **Ação em Massa:** Cria um grande número de instâncias (requer senha).          |
| `DELETE` | `/mass-delete`        | **⚠️ Ação Altamente Destrutiva:** Remove **TODAS** as instâncias (requer senha). |

---

## ⚠️ Pontos Importantes

* **💾 Persistência de Dados**
    * O uso de arquivos `JSON` é ideal para desenvolvimento, testes e cenários de baixo volume. Para um ambiente de produção robusto, é **fortemente recomendado** substituir a camada de persistência por um banco de dados (como PostgreSQL, MongoDB ou Redis).

* **🛡️ Segurança**
    * O arquivo `.env` contém chaves de API e outras informações sensíveis. Ele **nunca** deve ser versionado no Git. Utilize um arquivo `.env.example` como guia para as variáveis necessárias.
    * As rotas administrativas e de disparo em massa devem ser protegidas por autenticação em um ambiente de produção.

* **🎨 Customização e Recursos**
    * A interface (frontend) foi construída com EJS e pode ser facilmente customizada alterando os arquivos na pasta `views` e adicionando CSS.
    * O projeto já oferece uma base sólida com funcionalidades essenciais como envio em massa, webhooks para status e gerenciamento de múltiplas instâncias.

---

### 🤝 Dúvidas e Próximos Passos

Este projeto é um ponto de partida flexível. Sinta-se à vontade para abrir *issues* no repositório para relatar bugs, sugerir novas funcionalidades ou tirar dúvidas. Se precisar de ajuda com deploy, proteção de rotas ou integrações avançadas, a comunidade está aqui para ajudar!
