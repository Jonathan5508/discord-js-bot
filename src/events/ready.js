const { counterHandler, inviteHandler, presenceHandler } = require("@src/handlers");
const { cacheReactionRoles } = require("@schemas/ReactionRoles");
const { getSettings } = require("@schemas/Guild");

/**
 * @param {import('@src/structures').BotClient} client
 */
module.exports = async (client) => {
  client.logger.success(`Logged in as ${client.user.tag}! (${client.user.id})`);

  // Initialize Music Manager
  if (client.config.ERELA_JS.ENABLED) {
    client.erelaManager.init(client.user.id);
    client.logger.success("Music Manager initialized");
  }

  // Initialize Giveaways Manager
  if (client.config.GIVEAWAYS.ENABLED) {
    client.logger.log("Initializing giveaways manager...");
    client.giveawaysManager._init().then((_) => client.logger.success("Giveaway Manager initialized"));
  }

  // Update Bot Presence
  if (client.config.PRESENCE.ENABLED) {
    presenceHandler(client);
  }

  // Register Interactions
  if (client.config.INTERACTIONS.SLASH || client.config.INTERACTIONS.CONTEXT) {
    if (client.config.INTERACTIONS.GLOBAL) await client.registerInteractions();
    else await client.registerInteractions(client.config.INTERACTIONS.TEST_GUILD_ID);
  }

  // Load reaction roles to cache
  await cacheReactionRoles(client);

  client.cluster
    .broadcastEval(c => c.guilds.cache.size)
    .then(results => client.logger.success(`${results.reduce((prev, val) => prev + val, 0)} total guilds`));

  client.logger.success(`Total Clusters: ${client.cluster.count}`);
  client.logger.success(`Connected to cluster ${client.cluster.id}`);
  client.logger.success(`Total Shards: ${client.cluster.info.TOTAL_SHARDS}`);

  for (const guild of client.guilds.cache.values()) {
    const settings = await getSettings(guild);

    // initialize counter
    if (settings.counters.length > 0) {
      await counterHandler.init(guild, settings);
    }

    // cache invites
    if (settings.invite.tracking) {
      inviteHandler.cacheGuildInvites(guild);
    }
  }

  setInterval(() => counterHandler.updateCounterChannels(client), 10 * 60 * 1000);
};
