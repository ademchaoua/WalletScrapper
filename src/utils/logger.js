import chalk from "chalk";
import readline from "readline";

export async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(chalk.cyan(question), (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export async function logStep(message) {
  console.log(chalk.blueBright(`🔄 ${message}`));
}

export async function logSuccess(message) {
  console.log(chalk.green(`✅ ${message}`));
}

export async function logError(message) {
  console.error(chalk.red(`❌ ${message}`));
}

export async function logWarn(message) {
  console.warn(chalk.yellow(`⚠️ ${message}`));
}
