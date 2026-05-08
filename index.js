const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  REST,
  EmbedBuilder,
  PermissionFlagsBits
} = require('discord.js');

const config = require('./config.json');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// ========================
// 📌 COMANDOS
// ========================
const commands = [

  new SlashCommandBuilder()
    .setName('inicio')
    .setDescription('Painel da Polícia RP'),

  new SlashCommandBuilder()
    .setName('recrutar')
    .setDescription('Dar cargo para usuário')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Usuário')
        .setRequired(true)
    )
    .addRoleOption(opt =>
      opt.setName('cargo')
        .setDescription('Selecione o cargo da polícia')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('remover')
    .setDescription('Remover cargo de usuário')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Usuário')
        .setRequired(true)
    )
    .addRoleOption(opt =>
      opt.setName('cargo')
        .setDescription('Selecione o cargo da polícia')
        .setRequired(true)
    )

].map(cmd => cmd.toJSON());

// ========================
// 🌍 REGISTRO LIMPO (EVITA BUG)
// ========================
const rest = new REST({ version: '10' }).setToken(config.token);

async function syncCommands() {
  try {
    console.log("🧹 Limpando comandos antigos...");

    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: [] }
    );

    console.log("📡 Registrando comandos novos...");

    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands }
    );

    console.log("✅ Comandos sincronizados!");
  } catch (err) {
    console.error(err);
  }
}

syncCommands();

// ========================
// 🧠 LOG
// ========================
async function sendLog(guild, embed) {
  const canal = guild.channels.cache.get(config.canalLogs);
  if (!canal) return;
  canal.send({ embeds: [embed] });
}

// ========================
// 🤖 INTERAÇÕES
// ========================
client.on('interactionCreate', async interaction => {

  if (!interaction.isChatInputCommand()) return;

  const { guild, member } = interaction;

  const temPermissao = member.roles.cache.some(role =>
    config.cargosPermitidos.includes(role.id)
  );

  if (!temPermissao) {
    return interaction.reply({
      content: "❌ Sem permissão.",
      flags: 64
    });
  }

  // ========================
  // 📋 INICIO
  // ========================
  if (interaction.commandName === 'inicio') {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🚔 POLÍCIA RP")
          .setDescription("/recrutar\n/remover")
          .setColor("Blue")
      ],
      flags: 64
    });
  }

  // ========================
  // 🔧 RECRUTAR
  // ========================
  if (interaction.commandName === 'recrutar') {

    const usuario = interaction.options.getUser('usuario');
    const cargo = interaction.options.getRole('cargo');

    if (!cargo) {
      return interaction.reply({
        content: "❌ Nenhum cargo selecionado ou comando desatualizado.",
        flags: 64
      });
    }

    const membro = await guild.members.fetch(usuario.id);

    if (cargo.position >= guild.members.me.roles.highest.position) {
      return interaction.reply({
        content: "❌ Não posso usar esse cargo.",
        flags: 64
      });
    }

    await membro.roles.add(cargo);

    const embed = new EmbedBuilder()
      .setTitle("🟢 RECRUTAMENTO POLÍCIA")
      .addFields(
        { name: "👤 Usuário", value: `<@${usuario.id}>`, inline: true },
        { name: "🎖️ Cargo", value: `<@&${cargo.id}>`, inline: true },
        { name: "👮 Responsável", value: `<@${interaction.user.id}>`, inline: false }
      )
      .setColor("Green");

    await interaction.reply({ embeds: [embed] });
    await sendLog(guild, embed);
  }

  // ========================
  // 🔥 REMOVER
  // ========================
  if (interaction.commandName === 'remover') {

    const usuario = interaction.options.getUser('usuario');
    const cargo = interaction.options.getRole('cargo');

    if (!cargo) {
      return interaction.reply({
        content: "❌ Nenhum cargo selecionado ou comando desatualizado.",
        flags: 64
      });
    }

    const membro = await guild.members.fetch(usuario.id);

    if (cargo.position >= guild.members.me.roles.highest.position) {
      return interaction.reply({
        content: "❌ Não posso remover esse cargo.",
        flags: 64
      });
    }

    await membro.roles.remove(cargo);

    const embed = new EmbedBuilder()
      .setTitle("🔴 REMOÇÃO POLÍCIA")
      .addFields(
        { name: "👤 Usuário", value: `<@${usuario.id}>`, inline: true },
        { name: "🎖️ Cargo", value: `<@&${cargo.id}>`, inline: true },
        { name: "👮 Responsável", value: `<@${interaction.user.id}>`, inline: false }
      )
      .setColor("Red");

    await interaction.reply({ embeds: [embed] });
    await sendLog(guild, embed);
  }

});

client.login(config.token);
