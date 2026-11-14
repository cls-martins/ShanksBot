/**
 * Utilize este arquivo para definir as mensagens de boas-vindas e despedidas do grupo.
 * As mensagens podem conter a menção ao membro que entrou ou saiu do grupo.
 * Você pode personalizar as mensagens conforme necessário.
 *
 * Para colocar a menção ao membro, use "@member" na mensagem.
 *
 */
import path from "path";
import fs from "fs";

// Caminho para a imagem padrão caso o usuário não tenha foto de perfil
const DEFAULT_USER_IMAGE = path.resolve("assets", "images", "default-user.png");

/**
 * Busca a foto de perfil do participante ou retorna a imagem padrão local
 */
export async function getProfilePicture(socket, jid) {
  try {
    if (!jid) return DEFAULT_USER_IMAGE;
    
    // Tenta obter a URL da foto de perfil em alta resolução
    const profilePicUrl = await socket.profilePictureUrl(jid, "image");
    return { url: profilePicUrl };
  } catch (error) {
    // Se o usuário não tiver foto de perfil ou houver erro, usa a imagem padrão local
    if (fs.existsSync(DEFAULT_USER_IMAGE)) {
      return { url: DEFAULT_USER_IMAGE };
    }
    // Fallback de segurança se o ficheiro local não for encontrado
    return null;
  }
}

/**
 * Função para gerar o objeto da mensagem de boas-vindas com imagem
 */
export async function getWelcomeMessage(socket, memberJid) {
  const image = await getProfilePicture(socket, memberJid);
  const caption = `Seja bem vindo ao nosso grupo, @member! Acesse os comandos do bot em\n\n\`!menu\``;

  return {
    image,
    caption,
  };
}

/**
 * Função para gerar o objeto da mensagem de saída com imagem
 */
export async function getExitMessage(socket, memberJid) {
  const image = await getProfilePicture(socket, memberJid);
  const caption = `Poxa, @member saiu do grupo... Sentiremos sua falta!`;

  return {
    image,
    caption,
  };
}

// Mantidos por compatibilidade
export const welcomeMessage = "Seja bem vindo ao nosso grupo, @member! Acesse os comandos do bot em\n\n\n`!menu`";
export const exitMessage = "Poxa, @member saiu do grupo... Sentiremos sua falta!";

export function clearChat() {
  return `🗑️${"\n".repeat(1891)}🗑️`;
}
