import { Collection, Events, userMention } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import client from './client/index.js';
import config from './config/index.js';
import mongoDBConnect from './lib/mongo-db.js';
import schedules from './schedules/index.js';
import pomodoro from './service/utils/pomodoro.js';
import { channelLogWithoutEmbeds } from './service/utils/channel-log.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

client.cooldowns = new Collection();
client.commands = new Collection();

// Awaited before login, or an interaction can arrive before commands are registered.
const loadPromises = [];

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

// eslint-disable-next-line no-restricted-syntax
for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
  // eslint-disable-next-line no-restricted-syntax
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);

    loadPromises.push(
      (async () => {
        try {
          const command = (await import(pathToFileURL(filePath).href)).default;

          if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
          } else {
            // eslint-disable-next-line no-console
            console.info(
              `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
            );
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to load command at ${filePath}:`, error);
        }
      })(),
    );
  }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

// eslint-disable-next-line no-restricted-syntax
for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);

  loadPromises.push(
    (async () => {
      try {
        const event = (await import(pathToFileURL(filePath).href)).default;

        const runEvent = async (...args) => {
          try {
            await event.execute(...args);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error(`Error in ${event.name} event handler:`, error);
          }
        };

        if (event.once) {
          client.once(event.name, runEvent);
        } else {
          client.on(event.name, runEvent);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to load event at ${filePath}:`, error);
      }
    })(),
  );
}

await Promise.all(loadPromises);

client.on('error', (error) => {
  // eslint-disable-next-line no-console
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled promise rejection:', error);
});

await mongoDBConnect();

client.once(Events.ClientReady, async () => {
  let recovered = false;
  let ticking = false;
  const run = async () => {
    if (ticking) return;
    ticking = true;
    try {
      await pomodoro.serial(() => recovered ? pomodoro.tick() : pomodoro.recover(client));
      recovered = true;
    } catch (error) { console.error('Pomodoro worker:', error); } finally { ticking = false; }
  };
  // A single worker handles persisted deadlines; idle presets create no timer jobs.
  setInterval(run, 5000);
  await run();
});

await client.login(config.DISCORD_TOKEN);

await schedules();

if (process.env.NODE_ENV === 'production') {
  // login() resolves on READY, while the log guild is still an unavailable stub with no channels.
  const sendStartupPing = () =>
    channelLogWithoutEmbeds(`${userMention(config.ADMIN_USER_ID)}, bot is started!`);

  if (client.isReady()) {
    sendStartupPing();
  } else {
    client.once(Events.ClientReady, sendStartupPing);
  }
}
