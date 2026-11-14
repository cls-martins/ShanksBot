/*
Comando com frases do dia
*/

import { PREFIX } from "../../config.js";

// 50 frases prontas
const FRASES = [
  "A dor que você sente hoje é a força que você terá amanhã.",
  "O silêncio também é uma resposta, e frequentemente a mais sábia.",
  "Não alimente expectativas, cultive certezas no seu próprio potencial.",
  "Muitas vezes, a tempestade não vem para destruir sua vida, mas para limpar o seu caminho.",
  "Cuidado com o que você tolera; você está ensinando as pessoas como devem te tratar.",
  "O tempo não cura nada, ele apenas te ensina a conviver com as cicatrizes.",
  "Nem tudo o que você perde é uma perda; às vezes é um livramento.",
  "Sua paz vale mais do que a sua necessidade de ter a última palavra.",
  "Quem não aprecia a sua presença, não vai sentir a sua falta.",
  "Às vezes, a coragem não é um grande rugido, mas a voz mansa que diz: 'Tento de novo amanhã'.",
  "Nenhum mar calmo fez um marinheiro habilidoso.",
  "Você não é o que te aconteceu, você é o que escolhe se tornar.",
  "Aprenda a descansar, não a desistir.",
  "A raiva é um veneno que você bebe esperando que o outro morra.",
  "Não procure por milagres quando você pode ser um.",
  "Algumas portas precisam se fechar para que outras melhores possam se abrir.",
  "Valorize quem esteve com você no escuro, porque no claro qualquer um se aproxima.",
  "O passado é um bom lugar para visitar, mas um péssimo lugar para morar.",
  "A sabedoria começa no momento em que você aceita o que não pode mudar.",
  "Pessoas feridas ferem pessoas; pessoas curadas curam pessoas.",
  "O maior erro que você pode cometer na vida é o medo constante de cometer algum.",
  "Se nada mudar ao seu redor, mude você por dentro.",
  "A vida é 10% do que acontece com você e 90% de como você reage a isso.",
  "Nem tudo precisa da sua reação. Economize sua energia.",
  "O segredo para avançar é simplesmente começar.",
  "Nunca troque o que você mais quer na vida pelo que você quer agora.",
  "Sua única competição real é com quem você foi ontem.",
  "O orgulho constrói muros; a humildade constrói pontes.",
  "Quem planta sinceridade, colhe confiança.",
  "Existem momentos em que o melhor a fazer é se afastar e observar.",
  "A clareza só vem quando você para de tentar controlar o incontrolável.",
  "Palavras mostram quem alguém quer ser; atitudes mostram quem a pessoa realmente é.",
  "A maturidade chega quando você prefere ter paz do que ter razão.",
  "Não julgue o meu caminho se você não conheceu os meus buracos.",
  "Suas escolhas definem seu destino muito mais do que suas circunstâncias.",
  "O peso da disciplina é leve comparado ao peso do arrependimento.",
  "Não espere incentivo dos outros, seja o seu próprio combustível.",
  "A luz que te guia é muito mais forte do que as sombras que te cercam.",
  "A solidão ensina o valor da própria companhia.",
  "Não apresse o processo; as melhores coisas levam tempo para amadurecer.",
  "A vida não fica mais fácil, é você que fica mais forte.",
  "Crie hábitos que o seu 'eu do futuro' vai te agradecer por ter feito.",
  "A ingratidão é o combustível para a indiferença.",
  "Nem todo conselho vem de quem quer o seu bem; seja seletivo.",
  "Quem aceita qualquer coisa, nunca terá o que realmente merece.",
  "O segredo da mudança é focar toda a sua energia não em combater o velho, mas em construir o novo.",
  "Respeite o seu tempo, cada flor desabrocha na sua própria estação.",
  "Você não precisa provar nada a ninguém, apenas a si mesmo.",
  "Atitude é uma pequena coisa que faz uma enorme diferença.",
  "A verdadeira força está em continuar sorrindo, mesmo carregando um mundo nas costas."
];

export default {
  name: "frase-do-dia",
  description: "Envia uma frase reflexiva e impactante para o dia",
  commands: ["frasedodia", "frase-do-dia", "frase"],
  usage: `${PREFIX}frase-do-dia`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({ sendReply, sendSuccessReact }) => {
    await sendSuccessReact();

    // Sorteia uma das 50 frases da lista
    const randomIndex = Math.floor(Math.random() * FRASES.length);
    const selectedQuote = FRASES[randomIndex];

    // 1000 repetições do caractere invisível para forçar o "Ler mais..."
    const readMore = "\u200e".repeat(1000);

    const messageText = 
      `💭 *FRASE DO DIA*\n` +
      `─────────────────────\n` +
      `${readMore}\n` +
      `> "${selectedQuote}"\n\n` +
      `✨ _Reflita sobre isso hoje._`;

    await sendReply(messageText);
  },
};
