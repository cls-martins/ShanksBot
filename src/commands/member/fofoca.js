/*
Comando de fofocas do menu de brincadeiras
*/

import { PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";

// Lista com 50 fofocas aleatórias
const FOFOCAS = [
  "fala pra todo mundo que é fã de MPB, mas escondido chora ouvindo funk de 2012 no volume máximo. 🎧",
  "diz que não guarda rancor, mas tem uma lista no bloco de notas com o nome de todo mundo que já vacilou desde 2018. 📝",
  "já mandou mensagem pro ex fingindo que era 'número errado' só pra ver se o perfil ainda tinha foto. 📱",
  "entra na chamada de áudio do grupo dizendo que só vai ouvir, mas é quem mais fala o tempo todo. 🗣️",
  "tem mais de 3.000 figurinhas no WhatsApp e metade é só exposed do próprio grupo. 🖼️",
  "diz que está 'a caminho', mas na verdade ainda nem tirou a farsa do corpo nem ligou o chuveiro. 🚿",
  "compra curso de organização pessoal, mas não consegue manter a mesa limpa por 15 minutos. 🧹",
  "passa 4 horas escolhendo o que vai assistir na Netflix para no fim dormir nos primeiros 10 minutos do filme. 🍿",
  "prometeu que ia começar a academia na segunda-feira, mas até hoje só pagou a taxa de matrícula. 🏋️‍♂️",
  "fala mal de fofoca, mas quando ouve um 'mulher, tu não sabe...' chega a arrepiar os braços. 🕵️‍♀️",
  "tem uma pasta oculta na galeria cheia de prints que poderiam derrubar 3 governos locais. 📁",
  "finge que não viu a mensagem no WhatsApp pra responder só 8 horas depois e dizer 'nossa, tava ocupado(a)'. ⏳",
  "fala que não liga para curtidas, mas se a foto não bater a meta em 1 hora, apaga e finge que nada aconteceu. 📸",
  "já falou 'tô sem dinheiro' e 10 minutos depois apareceu com um lanche de R$ 60 entregue em casa. 🍔",
  "usa a mesma senha em absolutamente todos os sites e contas desde a época do Orkut. 🔑",
  "passa a noite inteira rolando o feed do TikTok e depois reclama que acorda cansado(a) sem motivo. 🌙",
  "só manda áudio de mais de 2 minutos e ainda exige que as pessoas ouçam em velocidade 2x. 🎙️",
  "fala que gosta de café puro e sem açúcar, mas escondido coloca três colheres de leite em pó. ☕",
  "fica abrindo e fechando a geladeira a cada 5 minutos esperando que uma pizza apareça do nada. 🍕",
  "já enviou print da conversa pra própria pessoa com quem tava brigando por engano. 🤦‍♂️",
  "diz que é uma pessoa super calma, mas quase quebra o celular quando a internet oscila 1 segundo. 📶",
  "fala pra todo mundo que sabe cozinhar, mas quando precisa fazer um ovo frito, a cozinha vira zona de guerra. 🍳",
  "deixa o celular no modo silencioso 24h por dia e depois reclama que ninguém consegue entrar em contato. 🔕",
  "guarda caixas vazias de eletrônicos novos no guarda-roupa 'por garantia' até hoje. 📦",
  "faz planos gigantescos pra sair no fim de semana, mas torce secretamente pra alguém cancelar tudo. 🛋️",
  "vai ao mercado comprar um pão e volta com R$ 150 em besteiras que nem precisava. 🛒",
  "diz que não é ciumento(a), mas sabe a hora exata em que o contatinho ficou online e offline. 🔍",
  "já pesquisou no Google como mudar de nome e morar em outro país depois de pagar um mico em público. 🌍",
  "escuta a mesma música durante 3 dias seguidos até enjoar completamente e pegar pavor dela. 🎵",
  "fala 'vou só ali e já volto', mas desaparece por 4 dias do WhatsApp. 🕳️",
  "diz que sabe falar inglês avançado, mas quando ouve uma música internacional só canta o enrolation. 🎤",
  "pede opinião sobre qual roupa usar no grupo e ignora o que todo mundo votou pra ir com a primeira opção. 👗",
  "manda 'preciso te contar uma coisa', desaparece por 2 horas e deixa todo mundo surtando no grupo. 💣",
  "tem um ranço instalado por alguém sem nunca ter trocado uma palavra com a pessoa na vida. 😒",
  "remedeia a dor de cabeça com 2 litros de energético e depois pergunta por que o coração tá acelerado. ⚡",
  "tem coragem de falar mal do signo dos outros, mas passa o dia lendo horóscopo no Instagram. 🔮",
  "tem mais de 50 guias abertas no navegador do celular e recusa fechar dizendo que 'vai ler depois'. 🌐",
  "compra marmita e fala pra visita que foi quem preparou com tempero da vovó. 🍲",
  "chora em comercial de margarina mas finge que tem o coração mais frio do mundo. 💔",
  "diz que é fitness, mas se ver uma coxinha na promoção perde totalmente o juízo. 🍗",
  "fica tirando 40 fotos no mesmo ângulo para no final postar a primeira que tirou. 📱",
  "deixa a bateria do celular chegar em 1% para só então procurar o carregador pela casa. 🔋",
  "entra em discussão na internet sobre assunto que nem entende só para não dar o braço a torcer. 🥊",
  "tem uma gaveta inteira cheia de fios e cabos enrolados que ninguém sabe de qual aparelho é. 🔌",
  "fala que ama frio, mas quando a temperatura cai para 20°C já coloca 3 casacos e luva. 🥶",
  "já treinou o discurso de agradecimento do Oscar na frente do espelho do banheiro usando o shampoo como microfone. 🏆",
  "faz uma compra online e fica atualizando o rastreio dos correios a cada 10 minutos. 🚚",
  "diz que não gosta de drama, mas quando começa uma confusão é o primeiro a pegar a pipoca. 🍿",
  "salva receita no Instagram pra fazer na semana, mas nunca comprou um ingrediente. 📖",
  "é quem mantém a paz no grupo, mas na vida real é o agente do caos perfeito. 😈",
];

export default {
  name: "fofoca",
  description: "Conta uma fofoca aleatória sobre um membro sorteado ou marcado no grupo",
  commands: ["fofoca", "fofocar", "babado"],
  usage: `${PREFIX}fofoca ou ${PREFIX}fofoca @membro`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    sendReply,
    sendWaitReact,
    sendSuccessReact,
    webMessage,
    remoteJid,
    isGroup,
    socket,
  }) => {
    if (!isGroup) {
      throw new WarningError("❌ Este comando só pode ser utilizado dentro de grupos.");
    }

    await sendWaitReact();

    try {
      let targetJid = null;

      // Verificação se houve marcação ou citação de mensagem
      const mentions = webMessage.message?.extendedTextMessage?.contextInfo?.mentionedJid;
      const quotedParticipant = webMessage.message?.extendedTextMessage?.contextInfo?.participant;

      if (mentions && mentions.length > 0) {
        targetJid = mentions[0];
      } else if (quotedParticipant) {
        targetJid = quotedParticipant;
      }

      // Se ninguém foi marcado, escolhe um membro aleatório do grupo
      if (!targetJid) {
        const groupMetadata = await socket.groupMetadata(remoteJid);
        const participants = groupMetadata.participants || [];

        if (participants.length === 0) {
          throw new Error("Não foi possível obter os participantes do grupo.");
        }

        // Seleciona um participante aleatório
        const randomParticipant = participants[Math.floor(Math.random() * participants.length)];
        targetJid = randomParticipant.id;
      }

      // Limpa o JID para exibição da menção
      const cleanTarget = targetJid.replace(/:[0-9]+/g, "");

      // Sorteia uma das 50 fofocas da lista
      const randomFofoca = FOFOCAS[Math.floor(Math.random() * FOFOCAS.length)];

      const messageText = 
        `🗣️ *BABADOS E FOFOCAS DO GRUPO* 🗣️\n\n` +
        `Fiquei sabendo que @${cleanTarget.split("@")[0]} ${randomFofoca}\n\n` +
        `🤫 *Não conta pra ninguém que fui eu que te disse!*`;

      await sendReply(messageText, [cleanTarget]);
      await sendSuccessReact();
    } catch (error) {
      console.error("Erro ao executar comando fofoca:", error);
      throw new WarningError("❌ Ocorreu um erro ao tentar contar a fofoca.");
    }
  },
};
