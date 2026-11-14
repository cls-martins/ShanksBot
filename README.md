# ShanksBot

![ShanksBot - Flk takeshi-bot](./assets/images/takeshi-bot.png)

## Desenvolvida do zero, no vídeo

[CRIANDO UM BOT DE WHATSAPP DO ZERO (GUIA DEFINITIVO) - BASE COMPLETA + 6 COMANDOS - JAVASCRIPT](https://youtu.be/6zr2NYIYIyc)

## 📋 Sumário

1. [Explicação importante](#importante)
2. [Sobre o Projeto](#sobre-este-projeto)
3. [Instalação](#instalação-no-termux)
    - [No Termux](#instalação-no-termux)
    - [No Windows](#instalação-no-windows)
4. [Funcionalidades](#funcionalidades-gerais)
    - [Funcionalidades gerais](#funcionalidades-gerais)
5. [Menu do bot](#onde-fica-o-menu-do-bot)
6. [Mensagens de boas vindas](#onde-modifico-a-mensagem-de-boas-vindas-e-quando-alguém-sai-do-grupo)
7. [Custom Middleware - Personalize o bot sem modificar arquivos principais](#custom-middleware---personalize-o-bot-sem-modificar-arquivos-principais)
8. [Estrutura de pastas](#estrutura-de-pastas)
9. [Atualizar o bot](#atualizar-o-bot)
10. [Erros comuns](#erros-comuns)
11. [Finalização](#finalização)

# Importante!
## Leia o conteúdo abaixo antes de qualquer coisa.

O código deste repositório está alterado para ser usado como ShanksBot. Utilize o https:github.com/guiireal/takeshi-bot como repositório de instalação de teste e repositório de auxílio, para depois aplicar a instalação através deste. 
### LEIA O TUTORIAL COMPLETO! ESTÁ COM O CONTEÚDO DIFERENTE DO TAKESHI-BOT

## Sobre este projeto

Este projeto não possui qualquer vínculo oficial com o WhatsApp. Ele foi desenvolvido de forma independente para interações automatizadas por meio da plataforma.

Não nos responsabilizamos por qualquer uso indevido deste bot. É de responsabilidade exclusiva do usuário garantir que sua utilização esteja em conformidade com os termos de uso do WhatsApp e a legislação vigente.

## Instalação no Termux (novo vídeo tutorial: [https://youtu.be/-yjn1Xe3ltg](https://youtu.be/-yjn1Xe3ltg))

1 - Abra o Termux e execute os comandos abaixo.
_Não tem o Termux? [Clique aqui e baixe a última versão](https://www.mediafire.com/file/wxpygdb9bcb5npb/Termux_0.118.3_Dev_Gui.apk) ou [clique aqui e baixe versão da Play Store](https://play.google.com/store/apps/details?id=com.termux) caso a versão do MediaFire anterior não funcione._

```sh
pkg upgrade -y && pkg update -y && pkg install git -y && pkg install nodejs-lts -y && pkg install ffmpeg -y
```

2 - Habilite o acesso da pasta storage, no termux.

```sh
termux-setup-storage
```

3 - Escolha uma pasta de sua preferência pra colocar os arquivos do bot.

Pastas mais utilizadas:

- /sdcard
- ~/storage/emulated/0
- ~/storage/emulated/0/Download (muito comum quando você baixa o bot pelo .zip)

No nosso exemplo, vamos para a `~/storage`

```sh
cd ~/storage
```

4 - Clone o repositório.

```sh
git clone https://github.com/guiireal/takeshi-bot.git
```

5 - Entre na pasta que foi clonada.

```sh
cd takeshi-bot
```

6 - Habilite permissões de leitura e escrita (faça apenas 1x esse passo).

```sh
chmod -R 755 ./*
```

7 - Instale as dependências do projeto.

Se você escolheu uma pasta de armazenamento compartilhado (como `/sdcard`, `~/storage/emulated/0` ou a pasta `Download`), use a flag `--no-bin-links`, pois esse tipo de armazenamento não suporta links simbólicos e o `npm install` normal vai falhar. Instale esses comandos um atrás do outro:

```sh
npm install --no-bin-links
```
```sh
npm install yt search --no-bin-links
```
```sh
npm install yt-dlp.yt-dlp --no-bin-links
```
ou 
```sh
winget install yt-dlp.yt-dlp --no-bin-links
```
Se você usou uma pasta interna do Termux (fora da `~/storage`), pode instalar normalmente:

```sh
npm install
```
```sh
npm install yt search
```

se o npm install yt search não funcionar, tente..

```sh
npm install yt-dlp.yt-dlp
```

8 - Execute o bot.

```sh
npm start
```

9 - Insira o número de telefone e pressione `enter`.

10 - Informe o código que aparece no termux, no seu WhatsApp, [assista aqui, caso não encontre essa opção](https://youtu.be/6zr2NYIYIyc?t=5395).

11 - Aguarde 10 segundos, depois digite `CTRL + C` para parar o bot.

Depois, Configure o arquivo `config.js` que está dentro da pasta `src`.

```js
// Prefixo padrão dos comandos.
export const PREFIX = "/";

// Emoji do bot (mude se preferir).
export const BOT_EMOJI = "🤖";

// Nome do bot (mude se preferir).
export const BOT_NAME = "Takeshi Bot";

// LID do bot (no caso, o que você rodará o bot).
// Para obter o LID do bot, use o comando <prefixo>lid respondendo em cima de uma mensagem do número do bot
// Troque o <prefixo> pelo prefixo do bot (ex: /lid).
export const BOT_LID = "12345678901234567890@lid";

// LID do dono do bot (no caso, o seu!).
// Para obter o LID do dono do bot, use o comando <prefixo>meu-lid
// Troque o <prefixo> pelo prefixo do bot (ex: /meu-lid).
export const OWNER_LID = "12345678901234567890@lid";
```

12 - Inicie o bot novamente.

```sh
npm start
```

## Instalação no Windows

1 - Abra o PowerShell como administrador.

Clique com o botão direito no menu iniciar, escolha `Terminal (Admin)` ou `Windows PowerShell (Admin)`.

2 - Instale o Git, Node.js 24.x.x ou superior e FFmpeg.

Se você usa Windows 10 ou Windows 11 com `winget`, execute:

```sh
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS -e
winget install --id Gyan.FFmpeg -e
```

Se algum comando acima não funcionar, instale manualmente:

- Git: [https://git-scm.com/downloads/win](https://git-scm.com/downloads/win)
- Node.js 24.x.x ou superior: [https://nodejs.org/en](https://nodejs.org/en)
- FFmpeg: [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html)

3 - Feche e abra o PowerShell novamente para atualizar o PATH.

4 - Verifique se o Node.js, npm, Git e FFmpeg foram instalados.

```sh
node -v
npm -v
git --version
ffmpeg -version
```

O comando `node -v` deve exibir uma versão `v24.x.x`.

5 - Escolha uma pasta para colocar os arquivos do bot.

No exemplo abaixo, vamos usar a Área de Trabalho:

```sh
cd $env:USERPROFILE\Desktop
```

6 - Clone o repositório.

```sh
git clone https://github.com/guiireal/takeshi-bot.git
```

7 - Entre na pasta clonada.

```sh
cd takeshi-bot
```

8 - Instale as dependências.

```sh
npm install
```
```sh
npm install yt search
```
```sh
npm install yt-dlp.yt-dlp
```

9 - Execute o bot.

```sh
npm start
```

10 - O bot vai solicitar que você digite seu número de telefone.
Digite **exatamente** como está no WhatsApp e apenas números.

Não adicione o 9º dígito em números que não sejam de SP ou RJ.

11 - Informe o código de pareamento no WhatsApp.

No WhatsApp, vá em `dispositivos conectados`, clique em `conectar dispositivo` e depois em `Conectar com número de telefone`.

12 - Aguarde a conexão e digite `CTRL + C` no PowerShell para parar o bot.

Depois, configure o arquivo `config.js` que está dentro da pasta `src`.

13 - Inicie o bot novamente.

```sh
npm start
```

## Onde fica o menu do bot?

O menu do bot fica dentro da pasta `src` no arquivo chamado `menu.js`

## Onde modifico a mensagem de boas vindas e quando alguém sai do grupo?

As mensagens ficam dentro da pasta `src` no arquivo chamado `messages.js`

## Custom Middleware - Personalize o bot sem modificar arquivos principais

O arquivo `src/middlewares/customMiddleware.js` permite adicionar lógica personalizada sem mexer nos arquivos core do bot.

### Quando usar?

- ✅ Adicionar comportamentos personalizados
- ✅ Criar logs customizados
- ✅ Implementar lógica específica por grupo
- ✅ Reagir a eventos automáticos

### Exemplos práticos

#### Exemplo 1: Reagir automaticamente a mensagens

```javascript
export async function customMiddleware({ socket, webMessage, type, commonFunctions }) {
  if (type === "message" && commonFunctions) {
    const { userMessageText } = commonFunctions;
    if (userMessageText?.toLowerCase() === "oi") {
      await socket.sendMessage(webMessage.key.remoteJid, {
        react: { text: "👋", key: webMessage.key }
      });
    }
  }
}
```

#### Exemplo 2: Log quando alguém entra no grupo

```javascript
export async function customMiddleware({ webMessage, type, action }) {
  if (type === "participant" && action === "add") {
    console.log("Novo membro:", webMessage.messageStubParameters[0]);
  }
}
```

#### Exemplo 3: Mensagem personalizada em grupo específico

```javascript
export async function customMiddleware({ type, action, commonFunctions }) {
  const grupoVIP = "120363123456789012@g.us";
  
  if (type === "participant" && action === "add" && commonFunctions?.remoteJid === grupoVIP) {
    const { sendReply } = commonFunctions;
    await sendReply("🎉 Bem-vindo ao grupo VIP!");
  }
}
```

#### Exemplo 4: Usar funções avançadas do bot

```javascript
export async function customMiddleware({ type, commonFunctions }) {
  if (type === "message" && commonFunctions) {
    const {
      sendReply,
      sendSuccessReply,
      args,
      userMessageText,
      isImage,
      downloadImage,
    } = commonFunctions;
    
    // Sua lógica personalizada aqui
  }
}
```

### Parâmetros disponíveis

| Parâmetro | Tipo | Descrição |
|-----------|------|----------|
| `socket` | Object | Socket do Baileys para enviar mensagens |
| `webMessage` | Object | Mensagem completa do WhatsApp |
| `type` | String | "message" ou "participant" |
| `commonFunctions` | Object/null | Todas as funções do bot (null para eventos de participantes) |
| `action` | String | "add" ou "remove" (apenas em eventos de participantes) |
| `data` | String | Dados do participante (apenas em eventos de participantes) |

## Estrutura de pastas

- 📁 .github ➔ _workflows de CI/CD e arquivo para o agente do copilot_
- 📁 assets ➔ _arquivos de mídia_
  - 📁 auth ➔ _arquivos da conexão do bot_
  - 📁 images ➔ _arquivos de imagem_
    - 📁 funny ➔ _gifs de comandos de diversão_
  - 📁 samples ➔ _arquivos de exemplo para testes_
  - 📁 temp ➔ _arquivos temporários_
- 📁 database ➔ _arquivos de dados_
- 📁 diagrams ➔ _diagramas de fluxos de dados e execução do Bot_
- 📁 node_modules ➔ _módulos do Node.js_
- 📁 scripts ➔ _scripts de apoio, incluindo o patch de botões e listas do Baileys_
- 📁 src ➔ _código fonte do bot (geralmente você mexerá mais aqui)_
  - 📁 @types ➔ _pasta onde fica as definições de tipos_
  - 📁 commands ➔ _pasta onde ficam os comandos_
    - 📁 admin ➔ _pasta onde ficam os comandos administrativos_
    - 📁 member ➔ _pasta onde ficam os comandos gerais (todos poderão utilizar)_
      - 📁 exemplos ➔ _pasta de exemplos apenas para exploração e reaproveitamento em comandos próprios_
    - 📁 owner ➔ _pasta onde ficam os comandos de dono (grupo e bot)_
    - 📝🤖-como-criar-comandos.js ➔ _arquivo de exemplo de como criar um comando_
  - 📁 errors ➔ _classes de erros usadas nos comandos_
  - 📁 middlewares ➔ _interceptadores de requisições_
  - 📁 services ➔ _serviços diversos_
  - 📁 test ➔ _testes_
  - 📁 utils ➔ _utilitários_
  - 📝 config.js ➔ _arquivo de configurações do bot_
  - 📝 connection.js ➔ _script de conexão do bot com a biblioteca Baileys_
  - 📝 index.js ➔ _script ponto de entrada do bot_
  - 📝 loader.js ➔ _script de carga de funções_
  - 📝 menu.js ➔ _menu do bot_
  - 📝 messages.js ➔ _arquivos de mensagens de boas vindas e saída_
  - 📝 test.js ➔ _script de testes_
- 📝 .gitignore ➔ _arquivo para não subir certas pastas no GitHub_
- 📝 ⚡-cases-estao-aqui.js ➔ _easter egg_
- 📝 AGENTS.md ➔ _arquivo de instruções para IA's_
- 📝 CLAUDE.md ➔ _arquivo de instruções para a IA Claude_
- 📝 GEMINI.md ➔ _arquivo de instruções para a IA Gemini_
- 📝 CONTRIBUTING.md ➔ _guia de contribuição_
- 📝 LICENSE ➔ _arquivo de licença_
- 📝 package-lock.json ➔ _arquivo de cache das dependências do bot_
- 📝 package.json ➔ _arquivo de definição das dependências do bot_
- 📝 README.md ➔ _esta documentação_
- 📝 reset-qr-auth.sh ➔ _arquivo para excluir as credenciais do bot_
- 📝 update.sh ➔ _arquivo de atualização do bot_

## Atualizar o bot

Execute `bash update.sh`

## Erros comuns

### 📁 Operação negada ao extrair a pasta

O erro abaixo acontece quando é feito o download do arquivo ZIP direto no celular em algumas versões do apk ZArchiver e também de celulares sem root.

Para resolver, siga o [tutorial de instalação via git clone](#instalação-no-termux).

![erro comum 1](./assets/images/erro-comum-1.jpg)

### 🔄 Remoção dos arquivos de sessão e conectar novamente

Caso dê algum erro na conexão, digite o seguinte comando:

```sh
bash reset-qr-auth.sh
```

Depois, remova o dispositivo do WhatsApp indo nas configurações do WhatsApp em "dispositivos conectados" e repita
o procedimento de iniciar o bot com `npm start`.

### ⏱️ Erro `rate-overlimit` após muito tempo offline

Quando o bot fica muito tempo desligado (por exemplo, horas ou um dia inteiro), ao religar ele pode tentar processar muitas mensagens acumuladas de uma vez.
Isso pode disparar erro de `rate-overlimit` durante a sincronização.

![erro comum 3](./assets/images/erro-comum-3.png)

Para corrigir, reinicie a autenticação do Baileys:

```sh
bash reset-qr-auth.sh
```

Em seguida, conecte o número novamente no WhatsApp em "dispositivos conectados".

### 🔐 Permission denied (permissão negada) ao acessar `cd /sdcard`

![erro comum 2](./assets/images/erro-comum-2.png)

Abra o termux, digite `termux-setup-storage` e depois, aceite as permissões

### ⚙️ Você configura o token da Spider API, prefixo, etc e o bot não reconhece

Verifique se você não tem dois Takeshi's rodando no seu celular, muitas pessoas baixam o zip e seguem o tutorial, porém, **o tutorial não explica pelo zip, e sim, pelo git clone**.

Geralmente as pessoas que cometem esse erro, ficam com dois bots:

1. O primeiro dentro da `/sdcard`
2. O segundo na pasta `/storage/emulated/0/Download`, que no zip fica como `takeshi-bot-main`

Você deve apagar um dos bots e tanto configurar quanto executar **apenas um**

O que você não pode fazer:

- Não pode transformar este código em algo proprietário (fechado) e impedir outras pessoas de acessá-lo ou usá-lo.

Esta licença garante que todos tenham acesso ao código-fonte e podem colaborar livremente, promovendo o compartilhamento e o aprimoramento do projeto.

## Finalização
Esse código pertence de primeira mão ao repo: https://github.com/guiireal/takeshi-bot 
