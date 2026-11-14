/*
Comando para pesquisar usando o Wikipedia.
*/

import axios from "axios";
import { PREFIX } from "../../config.js";

export default {
  name: "pesquisa",
  description: "Pesquisa um termo na Wikipédia",
  commands: ["pesquisa", "wiki", "wikipedia"],
  usage: `${PREFIX}pesquisa <termo>`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    args,
    sendText,
    sendSuccessReact,
    sendErrorReply,
  }) => {
    const query = args.join(" ");

    if (!query) {
      return await sendErrorReply(
        `Por favor, digite o que deseja pesquisar. Exemplo: \`${PREFIX}pesquisa Mario Nintendo\``
      );
    }

    try {
      await sendSuccessReact();

      // Configuração de cabeçalho exigida pela API da Wikipédia. CONFIGURE AQUI COMO QUISER.
      const customHeaders = {
        headers: {
          "User-Agent": "ShanksBot/1.0 (https://newgen-shitpost.vercel.app; contato@shanksbot.com)",
        },
      };

      // 1. Procura o termo na API da Wikipédia em português
      const searchUrl = `https://pt.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
        query
      )}&limit=1&namespace=0&format=json`;

      const searchRes = await axios.get(searchUrl, customHeaders);
      const [_, titles, descriptions, urls] = searchRes.data;

      if (!titles || titles.length === 0) {
        return await sendErrorReply(
          "❌ Nenhum resultado encontrado na Wikipédia para esta pesquisa."
        );
      }

      const title = titles[0];
      const url = urls[0];

      // 2. Obtém o resumo detalhado da página encontrada
      const summaryUrl = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        title
      )}`;
      const summaryRes = await axios.get(summaryUrl, customHeaders);
      const extract =
        summaryRes.data.extract || descriptions[0] || "Resumo não disponível.";

      // 3. Formata a mensagem com o trecho e o link
      const mensagem = `📚 *Wikipédia: ${title}*\n\n${extract}\n\n🔗 *Leia mais completo aqui:*\n${url}`;

      await sendText(mensagem);
    } catch (error) {
      console.error("Erro no comando pesquisa:", error.message || error);
      await sendErrorReply(
        "Ocorreu um erro ao consultar a Wikipédia. Tente novamente em alguns instantes."
      );
    }
  },
};
