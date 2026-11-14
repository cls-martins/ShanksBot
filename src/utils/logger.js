/**
 * Logs do powershell/termux
 *
 */
import pkg from "../../package.json" with { type: "json" };

let consoleNoiseFilterInstalled = false;

export function installConsoleNoiseFilter() {
  if (consoleNoiseFilterInstalled) {
    return;
  }

  const originalConsoleInfo = console.info.bind(console);

  console.info = (...args) => {
    if (args[0] === "Closing session:") {
      warningLog(
        "O WhatsApp fechou uma sessão criptografada antiga para renovar as chaves. Isso é um aviso normal da conexão e não indica erro no bot.",
      );
      return;
    }

    if (args[0] === "Removing old closed session:") {
      warningLog(
        "O WhatsApp removeu uma sessão criptografada antiga já fechada. Isso é limpeza normal do histórico de chaves e não indica erro no bot.",
      );
      return;
    }

    originalConsoleInfo(...args);
  };

  consoleNoiseFilterInstalled = true;
}

export function sayLog(message) {
  console.log("\x1b[36m[SHANKSBOT | TALK]\x1b[0m", message);
}

export function inputLog(message) {
  console.log("\x1b[30m[SHANKSBOT | INPUT]\x1b[0m", message);
}

export function infoLog(message) {
  console.log("\x1b[34m[SHANKSBOT | INFO]\x1b[0m", message);
}

export function successLog(message) {
  console.log("\x1b[32m[SHANKSBOT | SUCCESS]\x1b[0m", message);
}

export function errorLog(message) {
  console.log("\x1b[31m[SHANKSBOT | ERROR]\x1b[0m", message);
}

export function warningLog(message) {
  console.log("\x1b[33m[SHANKSBOT | WARNING]\x1b[0m", message);
}

export function bannerLog() {
  const red = "\x1b[31m";
  const reset = "\x1b[0m";

  console.log(`${red}░█▀▀░█░█░█▀█░█▀█░█░█░█▀▀░█▀▄░█▀█░▀█▀${reset}`);
  console.log(`${red}░▀▀█░█▀█░█▀█░█▀█░█▀█░█▀▀░█▀▄░█▀█░░█░${reset}`);
  console.log(`${red}░▀▀▀░▀░▀░▀░▀░▀░▀░▀░▀░▀▀▀░▀▀░░▀░▀░░▀░${reset}`);
  console.log(`${red}🤖 Versão: ${reset}${pkg.version}\n`);
}
