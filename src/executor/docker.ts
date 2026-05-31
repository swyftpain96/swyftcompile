import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);
const EXECUTION_TIMEOUT_MS = 30_000;
const EXECUTION_TIMEOUT_SECONDS = Math.ceil(EXECUTION_TIMEOUT_MS / 1000);

function stripAnsiSequences(text: string): string {
  return text.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');
}

function stripToolchainNoise(text: string): string {
  return text.replace(
    /^An issue was encountered verifying workloads\. For more information, run "dotnet workload update"\.\r?\n?/gm,
    ''
  );
}

export interface ExecutionResult {
  output: string;
  executionTimeMs: number;
  compilerVersion: string;
  sourceFile: string;
  exitCode: number | null;
  timedOut: boolean;
}

const versionCache: Record<string, string> = {};

export async function initDockerDaemons() {
  console.log("Initializing Docker daemons...");
  try {
    await execAsync('docker rm -f swyft-daemon-isolated swyft-daemon-net');
  } catch (e) {
    // Ignore errors if they don't exist
  }
  
  await execAsync('docker run -d --name swyft-daemon-isolated --rm -i --network none --memory 512m --cpus="1.0" --pids-limit 128 --read-only --cap-drop ALL --security-opt no-new-privileges --tmpfs /tmp:rw,nosuid,nodev,exec,size=384m code-runner-image sleep infinity');
  await execAsync('docker run -d --name swyft-daemon-net --rm -i --memory 512m --cpus="1.0" --pids-limit 128 --read-only --cap-drop ALL --security-opt no-new-privileges --tmpfs /tmp:rw,nosuid,nodev,exec,size=384m code-runner-image sleep infinity');
  console.log("Docker daemons are ready.");
}

async function getCompilerVersion(language: string, versionCmd: string): Promise<string> {
  if (versionCache[language]) return versionCache[language];
  try {
    // Both daemons have the same tools installed, so we can use isolated for checking versions
    const { stdout, stderr } = await execAsync(`docker exec -i swyft-daemon-isolated ${versionCmd}`);
    let version = (stdout || stderr).trim().split('\n')[0];
    if (version.length > 50) version = version.substring(0, 50) + '...';
    versionCache[language] = version;
    return version;
  } catch (err) {
    return 'Unknown version';
  }
}

export async function executeCode(language: string, code: string): Promise<ExecutionResult> {
  const normalizedLang = language.toLowerCase();
  const isSp = normalizedLang === 'sp';
  const daemonName = isSp ? 'swyft-daemon-net' : 'swyft-daemon-isolated';
  
  const id = randomUUID();
  const workDir = `/tmp/run_${id}`;

  let versionCmd = '';
  let runCmd = '';
  let sourceFile = 'main';

  switch (normalizedLang) {
    case 'python':
    case 'py':
      sourceFile = 'main.py';
      runCmd = 'cat > main.py && python3 main.py';
      versionCmd = 'python3 --version';
      break;
    case 'javascript':
    case 'js':
    case 'node':
    case 'nodejs':
      sourceFile = 'main.js';
      runCmd = 'cat > main.js && node main.js';
      versionCmd = 'node --version';
      break;
    case 'typescript':
    case 'ts':
      sourceFile = 'main.ts';
      runCmd = 'cat > main.ts && tsc main.ts --target ES2022 --module commonjs --outDir . && node main.js';
      versionCmd = 'tsc --version';
      break;
    case 'cpp':
    case 'c++':
    case 'cc':
    case 'cxx':
      sourceFile = 'main.cpp';
      runCmd = 'cat > main.cpp && g++ -std=gnu++23 main.cpp -lstdc++exp -o main && ./main';
      versionCmd = 'g++ --version';
      break;
    case 'c':
      sourceFile = 'main.c';
      runCmd = 'cat > main.c && gcc -std=gnu23 main.c -o main && ./main';
      versionCmd = 'gcc --version';
      break;
    case 'java':
      sourceFile = 'Main.java';
      runCmd = 'cat > Main.java && javac Main.java && java Main';
      versionCmd = 'javac --version';
      break;
    case 'rust':
    case 'rs':
      sourceFile = 'main.rs';
      runCmd = 'cat > main.rs && rustc --edition=2024 main.rs && ./main';
      versionCmd = 'rustc --version';
      break;
    case 'go':
    case 'golang':
      sourceFile = 'main.go';
      runCmd = 'cat > main.go && go run main.go';
      versionCmd = 'go version';
      break;
    case 'c#':
    case 'csharp':
    case 'cs':
      sourceFile = 'Program.cs';
      runCmd = 'mkdir -p app && cd app && cat > Program.cs && printf "%s\\n" "<Project Sdk=\\"Microsoft.NET.Sdk\\">" "  <PropertyGroup>" "    <OutputType>Exe</OutputType>" "    <TargetFramework>net10.0</TargetFramework>" "    <ImplicitUsings>enable</ImplicitUsings>" "    <Nullable>enable</Nullable>" "    <RestoreIgnoreFailedSources>true</RestoreIgnoreFailedSources>" "  </PropertyGroup>" "</Project>" > app.csproj && printf "%s\\n" "<?xml version=\\"1.0\\" encoding=\\"utf-8\\"?>" "<configuration>" "  <packageSources>" "    <clear />" "  </packageSources>" "</configuration>" > NuGet.Config && dotnet run --project app.csproj';
      versionCmd = 'dotnet --version';
      break;
    case 'haskell':
    case 'hs':
      sourceFile = 'main.hs';
      runCmd = 'cat > main.hs && runghc main.hs';
      versionCmd = 'ghc --version';
      break;
    case 'lisp':
    case 'cl':
      sourceFile = 'main.lisp';
      runCmd = 'cat > main.lisp && sbcl --script main.lisp';
      versionCmd = 'sbcl --version';
      break;
    case 'zig':
      sourceFile = 'main.zig';
      runCmd = 'cat > main.zig && zig run main.zig';
      versionCmd = 'zig version';
      break;
    case 'odin':
      sourceFile = 'main.odin';
      runCmd = 'cat > main.odin && odin run main.odin -file';
      versionCmd = 'odin version';
      break;
    case 'ruby':
    case 'rb':
      sourceFile = 'main.rb';
      runCmd = 'cat > main.rb && ruby main.rb';
      versionCmd = 'ruby --version';
      break;
    case 'php':
      sourceFile = 'main.php';
      runCmd = 'cat > main.php && php main.php';
      versionCmd = 'php --version';
      break;
    case 'lua':
      sourceFile = 'main.lua';
      runCmd = 'cat > main.lua && lua main.lua';
      versionCmd = 'lua -v';
      break;
    case 'bash':
    case 'sh':
      sourceFile = 'main.sh';
      runCmd = 'cat > main.sh && bash main.sh';
      versionCmd = 'bash --version';
      break;
    case 'perl':
    case 'pl':
      sourceFile = 'main.pl';
      runCmd = 'cat > main.pl && perl main.pl';
      versionCmd = 'perl --version';
      break;
    case 'kotlin':
    case 'kt':
      sourceFile = 'main.kt';
      runCmd = 'cat > main.kt && kotlinc main.kt -include-runtime -d main.jar 2>/dev/null && java -jar main.jar';
      versionCmd = 'kotlinc -version';
      break;
    case 'r':
      sourceFile = 'main.R';
      runCmd = 'cat > main.R && Rscript main.R';
      versionCmd = 'Rscript --version';
      break;
    case 'elixir':
    case 'ex':
      sourceFile = 'main.exs';
      runCmd = 'cat > main.exs && elixir main.exs';
      versionCmd = 'elixir --version';
      break;
    case 'nim':
      sourceFile = 'main.nim';
      runCmd = 'cat > main.nim && nim compile --run --hints:off main.nim';
      versionCmd = 'nim --version';
      break;
    case 'dart':
      sourceFile = 'main.dart';
      runCmd = 'cat > main.dart && dart run main.dart';
      versionCmd = 'dart --version';
      break;
    case 'sp':
      sourceFile = 'main.sp';
      runCmd = 'cat > main.sp && sp main.sp';
      versionCmd = 'echo 0.0.4';
      break;
    default:
      throw new Error(`Unsupported language: ${language}`);
  }

  // Pre-fetch version in background to save time
  const versionPromise = getCompilerVersion(normalizedLang, versionCmd);
  const startTime = performance.now();

  // Wrap user code with timing sentinels so we measure only the language runtime, not Docker overhead.
  // We print a sentinel line __T0__=<nanoseconds> before and __T1__=<nanoseconds> after execution.
  // These lines are stripped from output and used to compute actual execution time.
  const timedRunCmd = `echo "__T0__=$(date +%s%N)" && ( ${runCmd} ); _exit=$?; echo "__T1__=$(date +%s%N)"; exit $_exit`;
  const runEnv = [
    `HOME=${workDir}`,
    `XDG_CACHE_HOME=${workDir}/.cache`,
    `GOCACHE=${workDir}/.cache/go-build`,
    `NIMCACHE=${workDir}/.cache/nim`,
    `ZIG_GLOBAL_CACHE_DIR=${workDir}/.cache/zig`,
    `DOTNET_CLI_HOME=${workDir}`,
    'DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1',
    'DOTNET_CLI_TELEMETRY_OPTOUT=1',
    'DOTNET_NOLOGO=1',
    'DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE=true',
    'RUSTUP_HOME=/root/.rustup',
    'CARGO_HOME=/root/.cargo',
    'DART_SUPPRESS_ANALYTICS=true',
  ].join(' ');
  const fullShCmd = `mkdir -p ${workDir}/.cache && cd ${workDir} && ${runEnv} timeout ${EXECUTION_TIMEOUT_SECONDS}s sh -c '${timedRunCmd.replace(/'/g, "'\\''")}'; exitCode=$?; cd / && rm -rf ${workDir}; exit $exitCode`;
  const dockerArgs = ['exec', '-i', daemonName, 'sh', '-c', fullShCmd];

  const execution = await new Promise<{ output: string; exitCode: number | null; timedOut: boolean }>((resolve, reject) => {
    const child = spawn('docker', dockerArgs);
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
      if (stdout.length > 4000) {
        stdout = stdout.substring(0, 4000) + '...[Output Truncated]';
        child.kill();
      }
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
      if (stderr.length > 4000) {
        stderr = stderr.substring(0, 4000) + '...[Output Truncated]';
        child.kill();
      }
    });
    
    let finished = false;

    child.on('close', (codeStatus) => {
      if (finished) return;
      finished = true;
      if (codeStatus !== 0) {
        resolve({ output: stderr || stdout || `Process exited with code ${codeStatus}`, exitCode: codeStatus, timedOut: false });
      } else {
        resolve({ output: stdout + stderr || 'Execution finished with no output.', exitCode: codeStatus, timedOut: false });
      }
    });

    child.on('error', (err) => {
      if (finished) return;
      finished = true;
      reject(err);
    });
    
    child.stdin.write(code);
    child.stdin.end();
    
    setTimeout(() => {
      if (finished) return;
      finished = true;
      child.kill();
      resolve({ output: stdout + '\n[Execution Timed Out]', exitCode: null, timedOut: true });
    }, EXECUTION_TIMEOUT_MS);
  });

  const stripped = stripToolchainNoise(stripAnsiSequences(execution.output));

  // Parse timing sentinels emitted by the timed shell wrapper
  const t0Match = stripped.match(/__T0__=(\d+)/);
  const t1Match = stripped.match(/__T1__=(\d+)/);
  let executionTimeMs: number;
  if (t0Match && t1Match) {
    const ns = BigInt(t1Match[1]) - BigInt(t0Match[1]);
    executionTimeMs = Number(ns / 1_000_000n);
  } else {
    // Fallback to wall-clock time if sentinels are missing
    executionTimeMs = Math.round(performance.now() - startTime);
  }

  // Strip sentinel lines from user-visible output
  const cleanOutput = stripped
    .replace(/__T0__=\d+\n?/g, '')
    .replace(/__T1__=\d+\n?/g, '')
    .trimEnd();

  const compilerVersion = await versionPromise;

  return {
    output: cleanOutput,
    executionTimeMs,
    compilerVersion,
    sourceFile,
    exitCode: execution.exitCode,
    timedOut: execution.timedOut
  };
}
