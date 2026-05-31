import { Attachment, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { executeCode } from '../executor/docker';
import { CONTACT_FOOTER } from '../constants/contact';
import { buildUserErrorEmbed, checkRateLimit, getForbiddenCodeMessage, parseCompileInput } from './compileHelpers';

export async function handleCompileCommand(
  content: string,
  explicitLang?: string,
  attachment?: Attachment,
  userId?: string
): Promise<any> {
  const { language, code, error } = await parseCompileInput(content, explicitLang, attachment);
  if (error) {
    return { content: error };
  }

  if (!language) {
    return buildUserErrorEmbed(
      "Could not determine the programming language. Please specify it\n\ne.g.\n\n.compile\n\\`\\`\\`python\nprint('Hi')\n\\`\\`\\`\n\nor attach a file with a known extension."
    );
  }

  const trimmedCode = code.trim();
  const forbiddenMessage = getForbiddenCodeMessage(language, trimmedCode);
  if (forbiddenMessage) {
    return buildUserErrorEmbed(
      `This code uses a feature that is not allowed in this environment: ${forbiddenMessage}`
    );
  }

  const rateLimitMessage = checkRateLimit(userId);
  if (rateLimitMessage) {
    return buildUserErrorEmbed(rateLimitMessage);
  }

  if (!trimmedCode) {
    return buildUserErrorEmbed('No code provided to compile.');
  }

  const donoRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('💖 Support the Bot')
      .setStyle(ButtonStyle.Link)
      .setURL('https://paypal.me/mrjohnnyjo')
  );

  try {
    const result = await executeCode(language, trimmedCode);

    const embed = new EmbedBuilder()
      .setTitle('Code Execution Result')
      .setColor('#00FF00')
      .setDescription(`\`\`\`\n${result.output || 'No output.'}\n\`\`\``)
      .addFields(
        { name: '💻 Language', value: language, inline: true },
        { name: '⏱️ Execution Time', value: `${result.executionTimeMs}ms`, inline: true }
      )
      .setFooter({ text: `${result.compilerVersion} | ${CONTACT_FOOTER}` })
      .setTimestamp();

    return { embeds: [embed], components: [donoRow] };
  } catch (err: any) {
    const embed = new EmbedBuilder()
      .setTitle('Execution Error')
      .setColor('#FF0000')
      .setDescription(`\`\`\`\n${err.message}\n\`\`\``)
      .setFooter({ text: CONTACT_FOOTER })
      .addFields({ name: '💻 Language', value: language, inline: true })
      .setTimestamp();

    return { embeds: [embed], components: [donoRow] };
  }
}
