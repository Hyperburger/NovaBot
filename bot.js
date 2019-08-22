const { Client } = require("discord.js");
const bot = new Client();
const db = require("quick.db");
const botToken = "botToken";
const announcementChannelID = "614153326631583744";
const announcementCooldown = 120; //minutes
const reactionMessageID = "614156104397488144";
const reactionEmojiID = "542369978503004160";
const reactionRoleID = "614156368533782538";
bot.on('raw', async (packet) => {
  // We don't want this to run on unrelated packets
  if (!['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(packet.t)) return;
  // Grab the channel to check the message from
  const channel = await bot.channels.get(packet.d.channel_id);
  // There's no need to emit if the message is cached, because the event will fire anyway for that
  if (channel.messages.has(packet.d.message_id)) return;
  // Since we have confirmed the message is not cached, let's fetch it
  channel.fetchMessage(packet.d.message_id).then(message => {
    // Emojis can have identifiers of name:id format, so we have to account for that case as well
    const emoji = packet.d.emoji.id ? `${packet.d.emoji.name}:${packet.d.emoji.id}` : packet.d.emoji.name;
    // This gives us the reaction we need to emit the event properly, in top of the message object
    const reaction = message.reactions.get(emoji);
    // Adds the currently reacting user to the reaction's users collection.
    if (reaction) reaction.users.set(packet.d.user_id, bot.users.get(packet.d.user_id));
    // Check which type of event it is before emitting
    if (packet.t === 'MESSAGE_REACTION_ADD') {
      bot.emit('messageReactionAdd', reaction, bot.users.get(packet.d.user_id));
    };
    if (packet.t === 'MESSAGE_REACTION_REMOVE') {
      bot.emit('messageReactionRemove', reaction, bot.users.get(packet.d.user_id));
    };
  });
});
//on reaction add
bot.on("messageReactionAdd", async (reaction, user) => {
  //if it's reaction we want
  if (reaction.message.id == reactionMessageID && reaction.emoji.id == reactionEmojiID) {
    //get member and add him role
    const member = await reaction.message.guild.member(user);
    member.addRole(reactionRoleID);
  };
});
//on reaction remove
bot.on("messageReactionRemove", async (reaction, user) => {
  //if it's reaction we want
  if (reaction.message.id == reactionMessageID && reaction.emoji.id == reactionEmojiID) {
    //get member and remove him role
    const member = await reaction.message.guild.member(user);
    member.removeRole(reactionRoleID);
  };
});
//when bot is ready
bot.on('ready', () => {
setInterval(async () => {
  const messageSent = await db.fetch("messageLastSent");
  //if message should be sent first time
  if (!messageSent) {
    //get channel and send message
    const channel = await bot.channels.get(announcementChannelID);
    channel.send(`<@&${reactionRoleID}> i need to tell you something`)
    await db.set("messageLastSent", Date.now())
  } else {
    //if it's time to send it again
    if ((Date.now() - (messageSent + (announcementCooldown * 60 * 1000)) >= 0)) {
      //get channel and send new message
      const channel = await bot.channels.get(announcementChannelID);
      channel.send(`<@&${reactionRoleID}> i need to tell you something`)
      await db.set("messageLastSent", Date.now())
    };
  };
}, 60000);
});
bot.login(process.env.bottoken);
