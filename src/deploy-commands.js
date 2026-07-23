import { REST, Routes } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import config from './config/index.js';

const { CLIENT_ID: cliendId, DISCORD_TOKEN: discordToken } = config;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const commands = [];
// Grab all the command folders from the commands directory you created earlier
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

(async () => {
  // eslint-disable-next-line no-restricted-syntax
  for (const folder of commandFolders) {
    // Grab all the command files from the commands directory you created earlier
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
    // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
    // eslint-disable-next-line no-restricted-syntax
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);

      console.info(filePath);

      // eslint-disable-next-line no-await-in-loop
      const command = (await import(filePath)).default;

      if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
      } else {
        console.info(
          `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
        );
      }
    }
  }

  // Construct and prepare an instance of the REST module
  const rest = new REST().setToken(discordToken);

  // and deploy your commands!
  try {
    console.info(`Started refreshing ${commands.length} application (/) commands.`);

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(Routes.applicationCommands(cliendId), {
      body: commands,
    });
    console.info(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();
