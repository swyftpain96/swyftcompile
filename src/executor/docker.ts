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
  let compileCmd = '';
  let execCmd = '';

  switch (normalizedLang) {
    case 'python':
    case 'py':
      compileCmd = 'cat > main.py';
      execCmd = 'python3 main.py';
      versionCmd = 'python3 --version';
      break;
    case 'javascript':
    case 'js':
    case 'node':
    case 'nodejs':
      compileCmd = 'cat > main.js';
      execCmd = 'node main.js';
      versionCmd = 'node --version';
      break;
    case 'typescript':
    case 'ts':
      compileCmd = 'cat > main.ts && tsc main.ts --target ES2022 --module commonjs --outDir .';
      execCmd = 'node main.js';
      versionCmd = 'tsc --version';
      break;
    case 'cpp':
    case 'c++':
    case 'c':
    case 'cc':
      compileCmd = 'cat > main.cpp && g++ -std=gnu++23 main.cpp -lstdc++exp';
      execCmd = './a.out';
      versionCmd = 'g++ --version';
      break;
    case 'java':
      compileCmd = 'cat > Main.java && javac Main.java';
      execCmd = 'java Main';
      versionCmd = 'javac --version';
      break;
    case 'rust':
    case 'rs':
      compileCmd = 'cat > main.rs && rustc --edition=2024 main.rs';
      execCmd = './main';
      versionCmd = 'rustc --version';
      break;
    case 'go':
    case 'golang':
      compileCmd = 'cat > main.go && go build -o main main.go';
      execCmd = './main';
      versionCmd = 'go version';
      break;
    case 'c#':
    case 'csharp':
    case 'cs':
      compileCmd = 'mkdir -p app && cd app && cat > Program.cs && printf "%s\\n" "<Project Sdk=\\"Microsoft.NET.Sdk\\">" "  <PropertyGroup>" "    <OutputType>Exe</OutputType>" "    <TargetFramework>net10.0</TargetFramework>" "    <ImplicitUsings>enable</ImplicitUsings>" "    <Nullable>enable</Nullable>" "    <RestoreIgnoreFailedSources>true</RestoreIgnoreFailedSources>" "  </PropertyGroup>" "</Project>" > app.csproj && printf "%s\\n" "<?xml version=\\"1.0\\" encoding=\\"utf-8\\"?>" "<configuration>" "  <packageSources>" "    <clear />" "  </packageSources>" "</configuration>" > NuGet.Config && dotnet build app.csproj';
      execCmd = 'dotnet run --no-build --project app.csproj';
      versionCmd = 'dotnet --version';
      break;
    case 'haskell':
    case 'hs':
      compileCmd = 'cat > main.hs && ghc -o main main.hs';
      execCmd = './main';
      versionCmd = 'ghc --version';
      break;
    case 'lisp':
    case 'cl':
      compileCmd = 'cat > main.lisp';
      execCmd = 'sbcl --script main.lisp';
      versionCmd = 'sbcl --version';
      break;
    case 'zig':
      compileCmd = 'cat > main.zig && zig build-exe main.zig -femit-bin=main';
      execCmd = './main';
      versionCmd = 'zig version';
      break;
    case 'odin':
      compileCmd = 'cat > main.odin && odin build main.odin -file -out:main -microarch:native';
      execCmd = './main';
      versionCmd = 'odin version';
      break;
    case 'ruby':
    case 'rb':
      compileCmd = 'cat > main.rb';
      execCmd = 'ruby main.rb';
      versionCmd = 'ruby --version';
      break;
    case 'php':
      compileCmd = 'cat > main.php';
      execCmd = 'php main.php';
      versionCmd = 'php --version';
      break;
    case 'lua':
      compileCmd = 'cat > main.lua';
      execCmd = 'lua main.lua';
      versionCmd = 'lua -v';
      break;
    case 'bash':
    case 'sh':
      compileCmd = 'cat > main.sh';
      execCmd = 'bash main.sh';
      versionCmd = 'bash --version';
      break;
    case 'perl':
    case 'pl':
      compileCmd = 'cat > main.pl';
      execCmd = 'perl main.pl';
      versionCmd = 'perl --version';
      break;
    case 'kotlin':
    case 'kt':
      compileCmd = 'cat > main.kt && kotlinc main.kt -include-runtime -d main.jar 2>/dev/null';
      execCmd = 'java -jar main.jar';
      versionCmd = 'kotlinc -version';
      break;
    case 'r':
      compileCmd = 'cat > main.R';
      execCmd = 'Rscript main.R';
      versionCmd = 'Rscript --version';
      break;
    case 'elixir':
    case 'ex':
      compileCmd = 'cat > main.exs';
      execCmd = 'elixir main.exs';
      versionCmd = 'elixir --version';
      break;
    case 'nim':
      compileCmd = 'cat > main.nim && nim compile --hints:off -o:main main.nim';
      execCmd = './main';
      versionCmd = 'nim --version';
      break;
    case 'clojure':
    case 'clj':
      compileCmd = 'cat > main.clj';
      execCmd = 'clojure -M main.clj';
      versionCmd = 'clojure -Sdescribe';
      break;
    case 'pascal':
    case 'pas':
      compileCmd = 'cat > main.pas && fpc main.pas';
      execCmd = './main';
      versionCmd = 'fpc -iV';
      break;
    case 'fortran':
    case 'f90':
      compileCmd = 'cat > main.f90 && gfortran main.f90 -o main';
      execCmd = './main';
      versionCmd = 'gfortran --version';
      break;
    case 'julia':
    case 'jl':
      compileCmd = 'cat > main.jl';
      execCmd = 'julia main.jl';
      versionCmd = 'julia --version';
      break;
    case 'dart':
      compileCmd = 'cat > main.dart && dart compile exe main.dart -o main';
      execCmd = './main';
      versionCmd = 'dart --version';
      break;
    case 'sp':
      compileCmd = 'cat > main.sp';
      execCmd = 'sp main.sp';
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
  const timedRunCmd = `${compileCmd} && echo "__T0__=$(date +%s%N)" && ( ${execCmd} ); _exit=$?; echo "__T1__=$(date +%s%N)"; exit $_exit`;
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

  const output = await new Promise<string>((resolve, reject) => {
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
        resolve(stderr || stdout || `Process exited with code ${codeStatus}`);
      } else {
        resolve(stdout + stderr || 'Execution finished with no output.');
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
      resolve(stdout + '\n[Execution Timed Out]');
    }, EXECUTION_TIMEOUT_MS);
  });

  const stripped = stripToolchainNoise(stripAnsiSequences(output));

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
    compilerVersion
  };
}
