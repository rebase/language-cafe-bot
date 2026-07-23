import { Collection, userMention } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import client from './client/index.js';
import config from './config/index.js';
import mongoDBConnect from './lib/mongo-db.js';
import schedules from './schedules/index.js';
import PomodoroGroup from './models/pomodoro-group.js';
import { putPomodoroScheduleJob } from './service/interaction/is-chat-input-command/create-pomodoro-group.js';
import { channelLogWithoutEmbeds } from './service/utils/channel-log.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

client.cooldowns = new Collection();
client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

// eslint-disable-next-line no-restricted-syntax
for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
  // eslint-disable-next-line no-restricted-syntax
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);

    (async () => {
      const command = (await import(filePath)).default;

      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
      } else {
        // eslint-disable-next-line no-console
        console.info(
          `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
        );
      }
    })();
  }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

// eslint-disable-next-line no-restricted-syntax
for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);

  (async () => {
    const event = (await import(filePath)).default;

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  })();
}

await client.login(config.DISCORD_TOKEN);

await mongoDBConnect();
schedules();

// put pomodoro schedule job
const pomodoroGroupRes = await PomodoroGroup.find();
if (pomodoroGroupRes.length > 0) {
  // eslint-disable-next-line no-console
  console.info(
    `Bot found ${pomodoroGroupRes.length} pomodoro group(s), ${pomodoroGroupRes
      .map((group) => group.name)
      .join(', ')}`,
  );
  pomodoroGroupRes.forEach((group) => {
    const { name, timeOption, startTimeStamp, channelId } = group;
    putPomodoroScheduleJob({ groupName: name, timeOption, startTimeStamp, channelId });
  });
}

if (process.env.NODE_ENV === 'production') {
  channelLogWithoutEmbeds(`${userMention(config.ADMIN_USER_ID)}, bot is started!`);
}
