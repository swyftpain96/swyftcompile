import { Attachment, EmbedBuilder } from 'discord.js';

export interface ForbiddenRule {
  regex: RegExp;
  message: string;
}

export const CODE_BLOCK_REGEX = /```(\w*)\s*?\n([\s\S]*?)```/;

export const EXTENSION_TO_LANG: Record<string, string> = {
  'py': 'python',
  'js': 'javascript',
  'ts': 'typescript',
  'cpp': 'cpp',
  'cc': 'cpp',
  'cxx': 'cpp',
  'c': 'cpp',
  'java': 'java',
  'rs': 'rust',
  'go': 'go',
  'cs': 'c#',
  'hs': 'haskell',
  'lisp': 'lisp',
  'cl': 'lisp',
  'zig': 'zig',
  'odin': 'odin',
  'rb': 'ruby',
  'php': 'php',
  'lua': 'lua',
  'sh': 'bash',
  'bash': 'bash',
  'pl': 'perl',
  'kt': 'kotlin',
  'r': 'r',
  'ex': 'elixir',
  'exs': 'elixir',
  'nim': 'nim',
  'dart': 'dart',
  'sp': 'sp'
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map<string, number[]>();

export const LANGUAGE_FORBIDDEN_RULES: Record<string, ForbiddenRule[]> = {
  python: [
    { regex: /\b(import|from)\s+(os|shutil|subprocess|socket|ctypes|multiprocessing|threading|pathlib|sys)\b/, message: 'importing system and process modules is not allowed in this environment.' },
    { regex: /\b(os\.(remove|unlink|rmdir|system|popen)|subprocess\.|shutil\.|ctypes\.|socket\.)/, message: 'system-level file or process operations are forbidden.' }
  ],
  javascript: [
    { regex: /\b(require\(['"](child_process|fs)['"]|import\s+.*\s+from\s+['"](child_process|fs)['"] )\b/, message: 'direct filesystem and process imports are forbidden for safety.' },
    { regex: /\b(child_process|process\.(exit|kill|abort)|spawn\(|exec\(|execSync\(|fork\()/, message: 'spawning processes is not allowed in this environment.' }
  ],
  typescript: [
    { regex: /\b(require\(['"](child_process|fs)['"]|import\s+.*\s+from\s+['"](child_process|fs)['"] )\b/, message: 'direct filesystem and process imports are forbidden for safety.' },
    { regex: /\b(child_process|process\.(exit|kill|abort)|spawn\(|exec\(|execSync\(|fork\()/, message: 'spawning processes is not allowed in this environment.' }
  ],
  cpp: [
    { regex: /#include\s*<(filesystem|unistd\.h|sys\/stat\.h|sys\/types\.h|sys\/wait\.h|sys\/socket\.h|netinet\/in\.h|arpa\/inet\.h|spawn\.h)>/, message: 'low-level filesystem, socket, and process headers are blocked for container safety.' },
    { regex: /\b(system|popen|fork|exec(v|vp|ve)?|remove|rename|unlink|mkdir|rmdir)\s*\(/, message: 'system-level commands are forbidden in this execution environment.' }
  ],
  java: [
    { regex: /\bimport\s+java\.(io|nio|net)\b/, message: 'direct Java IO, networking and file system imports are restricted.' },
    { regex: /\b(Runtime\.getRuntime|ProcessBuilder|System\.exit\(|File\.(delete|rename|createNewFile)|Files\.)\b/, message: 'process and file system operations are forbidden in this environment.' }
  ],
  rust: [
    { regex: /\b(use\s+std::process|std::process::Command|Command::new|std::os::)/, message: 'process and low-level OS operations are restricted.' },
    { regex: /\b(std::fs::remove_file|std::fs::remove_dir_all|remove_file|remove_dir_all)\b/, message: 'file removal operations are forbidden in this environment.' }
  ],
  go: [
    { regex: /\bimport\s*(?:\(|\s+)(?:[\s\S]*\b("os\/exec"|"syscall"|"plugin"|"os"|"net"|"net\/http")\b)/, message: 'unsafe Go imports are restricted for this execution environment.' },
    { regex: /\b(os\.(Remove|RemoveAll|Rename|Exec)|exec\.Command|syscall\.|plugin\.)\b/, message: 'system and process operations are forbidden in this environment.' }
  ],
  'c#': [
    { regex: /\busing\s+System\.(IO|Net|Diagnostics)\b/, message: 'unsafe I/O, networking, and process libraries are restricted.' },
    { regex: /\b(System\.IO\.|File\.(Delete|Move|Copy)|Directory\.(Delete|Move|CreateDirectory)|Process\.Start|Environment\.Exit)\b/, message: 'process and file system operations are forbidden in this environment.' }
  ],
  haskell: [
    { regex: /\b(import\s+System\.(Process|Directory)|System\.Process|System\.Directory)\b/, message: 'process and filesystem operations are forbidden in this environment.' },
    { regex: /\b(import\s+Network\.|Network\.)\b/, message: 'low-level networking imports are restricted for safety.' }
  ],
  ruby: [
    { regex: /\b(system|exec|spawn|popen|IO\.popen|Open3|Kernel\.exec|File\.(delete|unlink|rename|open)|Dir\.(delete|rmdir|mkdir))\b/, message: 'shell and file operations are forbidden in this environment.' },
    { regex: /`[^`]*`/, message: 'shell escape syntax is not allowed in this environment.' }
  ],
  php: [
    { regex: /\b(unlink|exec|system|shell_exec|popen|proc_open|pcntl_fork|passthru|`[^`]*`)\s*\(/, message: 'shell and unsafe file operations are forbidden in this environment.' }
  ],
  lua: [
    { regex: /\b(os\.(execute|remove|rename|exit)|io\.popen|package\.load|loadfile|dofile)\b/, message: 'shell and file operations are forbidden in this environment.' }
  ],
  sp: [
    { regex: /\bprocess\s*\.\s*(run|spawn)\s*\(/, message: 'running external processes is forbidden in this bot environment.' },
    { regex: /\bnet\s*\.\s*serve\s*\(/, message: 'starting an HTTP server is not supported in this bot environment.' },
    { regex: /\bconsole\s*\.\s*read\s*\(/, message: 'interactive console input is not supported in this bot environment.' },
    { regex: /\buse\s+gui\b|\bgui\s*\./, message: 'GUI-related features are not supported in this bot environment.' }
  ],
  bash: [
    { regex: /\b(curl|wget|nc|netcat|ncat|ssh|scp|ftp|telnet|nmap)\b/, message: 'network tools are forbidden in this environment.' },
    { regex: /\b(rm\s+-rf|mkfs|dd\s+if|fdisk|shutdown|reboot|halt|init\s+0)\b/, message: 'destructive system commands are forbidden.' },
    { regex: /\b(docker|kubectl|systemctl|service|mount|umount|chroot)\b/, message: 'container and system management commands are forbidden.' },
    { regex: /:[\s]*\(\s*\)\s*\{.*:[\s]*\|.*:[\s]*&.*\}/, message: 'fork bomb patterns are not allowed.' }
  ],
  perl: [
    { regex: /\b(system|exec|open|backtick|qx\/|`[^`]*`)/, message: 'shell execution and file operations are forbidden.' },
    { regex: /\b(unlink|rename|mkdir|rmdir|chdir)\s*\(/, message: 'file system operations are forbidden in this environment.' }
  ],
  kotlin: [
    { regex: /\bimport\s+java\.(io|nio|net)\b/, message: 'direct Java IO and networking imports are restricted.' },
    { regex: /\b(Runtime\.getRuntime|ProcessBuilder|System\.exit)\b/, message: 'process operations are forbidden in this environment.' }
  ],
  r: [
    { regex: /\b(system|system2|shell|shell_exec|pipe|file\.remove|unlink|file\.rename)\s*\(/, message: 'shell and file operations are forbidden in this environment.' }
  ],
  elixir: [
    { regex: /\b(System\.cmd|:os\.cmd|Port\.open|File\.rm|File\.rm_rf)\b/, message: 'shell and file operations are forbidden in this environment.' }
  ],
  nim: [
    { regex: /\b(execCmd|execProcess|execShellCmd|os\.removeFile|os\.removeDir)\b/, message: 'shell and file operations are forbidden in this environment.' }
  ],
  dart: [
    { regex: /\bimport\s+'dart:io'/, message: 'dart:io filesystem and process access is restricted.' },
    { regex: /\b(Process\.run|Process\.start|File\(.+\)\.delete|Directory\(.+\)\.delete)\b/, message: 'process and file operations are forbidden in this environment.' }
  ]
};

export function buildUserErrorEmbed(description: string) {
  const errorEmbed = new EmbedBuilder()
    .setTitle('❌ Error')
    .setColor('#FF0000')
    .setDescription(description)
    .setTimestamp();

  return { embeds: [errorEmbed] };
}

export function checkRateLimit(userId?: string): string | undefined {
  if (!userId) return undefined;

  const now = Date.now();
  const attempts = rateLimitMap.get(userId) ?? [];
  const recent = attempts.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX) {
    const secondsLeft = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - recent[0])) / 1000);
    return `Rate limit exceeded. Please wait ${secondsLeft} second${secondsLeft === 1 ? '' : 's'} and try again.`;
  }

  recent.push(now);
  rateLimitMap.set(userId, recent);
  return undefined;
}

export function getForbiddenCodeMessage(language: string, code: string): string | undefined {
  const normalized = language.toLowerCase();
  const rules = LANGUAGE_FORBIDDEN_RULES[normalized];
  if (!rules) return undefined;

  for (const rule of rules) {
    if (rule.regex.test(code)) {
      return rule.message;
    }
  }

  return undefined;
}

export function getLanguageFromAttachment(attachment: Attachment): string | undefined {
  if (!attachment.name) return undefined;

  const extMatch = attachment.name.match(/\.([a-zA-Z0-9]+)$/);
  if (!extMatch) return undefined;

  const ext = extMatch[1].toLowerCase();
  return EXTENSION_TO_LANG[ext] || ext;
}

export async function parseCompileInput(
  content: string,
  explicitLang?: string,
  attachment?: Attachment
): Promise<{ language?: string; code: string; error?: string }> {
  let language = explicitLang?.trim();
  let code = '';

  if (attachment) {
    try {
      const response = await fetch(attachment.url);
      if (!response.ok) throw new Error('Failed to download attachment.');
      code = await response.text();
      if (!language) {
        language = getLanguageFromAttachment(attachment);
      }
    } catch (err: any) {
      return { code: '', error: `❌ Error fetching file: ${err.message}` };
    }

    return { language, code };
  }

  const match = CODE_BLOCK_REGEX.exec(content);
  if (match) {
    const blockLang = match[1];
    code = match[2];

    if (!language && blockLang) {
      language = blockLang;
    }
  } else {
    code = content.trim();
  }

  if (!language && content) {
    const firstWordMatch = content.trim().match(/^(\w+)/);
    if (firstWordMatch && !content.trim().startsWith('```')) {
      language = firstWordMatch[1];
      if (code.startsWith(language)) {
        code = code.slice(language.length).trim();
      }
    }
  }

  return { language, code };
}
