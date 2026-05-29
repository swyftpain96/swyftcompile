import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const donoRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder()
    .setLabel('💖 Support the Bot')
    .setStyle(ButtonStyle.Link)
    .setURL('https://paypal.me/mrjohnnyjo')
);

export const HELP_MESSAGE = {
  embeds: [
    new EmbedBuilder()
      .setTitle('Discord Code Compiler Bot')
      .setColor('#5865F2')
      .setDescription('Available commands:\n\n- `.compile <language> <code>` - Compile code directly.\n- `.compile` with a file attached - Compile the attached file.\n- `/compile` - Slash command to compile code or file.\n- **Context Menu**: Right click a message -> Apps -> Compile Message.\n- `.languages` or `/languages` - See supported languages.')
  ],
  components: [donoRow]
};

export const LANGUAGES_MESSAGE = {
  embeds: [
    new EmbedBuilder()
      .setTitle('Supported Languages')
      .setColor('#5865F2')
      .setDescription('Here is a list of supported languages and their abbreviations:\n\n- Python (`python`, `py`)\n- Node.js (`javascript`, `js`, `node`)\n- TypeScript (`typescript`, `ts`)\n- C++ (`cpp`, `c++`, `c`, `cc`)\n- Java (`java`)\n- Rust (`rust`, `rs`)\n- Go (`go`, `golang`)\n- C# (`c#`, `csharp`, `cs`)\n- Haskell (`haskell`, `hs`)\n- Lisp (`lisp`, `cl`)\n- Zig (`zig`)\n- Odin (`odin`)\n- Ruby (`ruby`, `rb`)\n- PHP (`php`)\n- Lua (`lua`)\n- Bash (`bash`, `sh`)\n- Perl (`perl`, `pl`)\n- Kotlin (`kotlin`, `kt`)\n- R (`r`)\n- Elixir (`elixir`, `ex`)\n- Nim (`nim`)\n- Dart (`dart`)\n- SP / SwyftPain (`sp`)')
  ],
  components: [donoRow]
};
