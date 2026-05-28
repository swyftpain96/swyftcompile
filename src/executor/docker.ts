import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);

function stripAnsiSequences(text: string): string {
  return text.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');
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
  
  await execAsync('docker run -d --name swyft-daemon-isolated --rm -i --network none --memory 512m --cpus="1.0" --pids-limit 128 --read-only --cap-drop ALL --security-opt no-new-privileges --tmpfs /tmp:rw,nosuid,nodev,size=128m code-runner-image sleep infinity');
  await execAsync('docker run -d --name swyft-daemon-net --rm -i --memory 512m --cpus="1.0" --pids-limit 128 --read-only --cap-drop ALL --security-opt no-new-privileges --tmpfs /tmp:rw,nosuid,nodev,size=128m code-runner-image sleep infinity');
  console.log("Docker daemons are ready.");
}

async function getCompilerVersion(language: string, versionCmd: string): Promise<string> {
  if (versionCache[language]) return versionCache[language];
  try {
    // Both daemons have the same tools installed, so we can use isolated for checking versions
    const { stdout } = await execAsync(`docker exec -i swyft-daemon-isolated ${versionCmd}`);
    let version = stdout.trim().split('\n')[0];
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
  
  switch (normalizedLang) {
    case 'python':
    case 'py':
      runCmd = 'cat > main.py && python3 main.py';
      versionCmd = 'python3 --version';
      break;
    case 'javascript':
    case 'js':
    case 'node':
    case 'nodejs':
      runCmd = 'cat > main.js && node main.js';
      versionCmd = 'node --version';
      break;
    case 'typescript':
    case 'ts':
      runCmd = 'cat > main.ts && ts-node main.ts';
      versionCmd = 'tsc --version';
      break;
    case 'cpp':
    case 'c++':
    case 'c':
    case 'cc':
      runCmd = 'cat > main.cpp && g++ main.cpp && ./a.out';
      versionCmd = 'g++ --version';
      break;
    case 'java':
      runCmd = 'cat > Main.java && javac Main.java && java Main';
      versionCmd = 'javac --version';
      break;
    case 'rust':
    case 'rs':
      runCmd = 'cat > main.rs && rustc main.rs && ./main';
      versionCmd = 'rustc --version';
      break;
    case 'go':
    case 'golang':
      runCmd = 'cat > main.go && go run main.go';
      versionCmd = 'go version';
      break;
    case 'c#':
    case 'csharp':
    case 'cs':
      runCmd = 'mkdir -p app && cd app && dotnet new console --force > /dev/null && cat > Program.cs && dotnet run';
      versionCmd = 'dotnet --version';
      break;
    case 'haskell':
    case 'hs':
      runCmd = 'cat > main.hs && runghc main.hs';
      versionCmd = 'ghc --version';
      break;
    case 'lisp':
    case 'cl':
      runCmd = 'cat > main.lisp && sbcl --script main.lisp';
      versionCmd = 'sbcl --version';
      break;
    case 'zig':
      runCmd = 'cat > main.zig && zig run main.zig';
      versionCmd = 'zig version';
      break;
    case 'odin':
      runCmd = 'cat > main.odin && odin run main.odin -file';
      versionCmd = 'odin version';
      break;
    case 'ruby':
    case 'rb':
      runCmd = 'cat > main.rb && ruby main.rb';
      versionCmd = 'ruby --version';
      break;
    case 'php':
      runCmd = 'cat > main.php && php main.php';
      versionCmd = 'php --version';
      break;
    case 'lua':
      runCmd = 'cat > main.lua && lua5.3 main.lua';
      versionCmd = 'lua5.3 -v';
      break;
    case 'sp':
      runCmd = 'cat > main.sp && sp main.sp';
      versionCmd = 'echo 0.0.4';
      break;
    default:
      throw new Error(`Unsupported language: ${language}`);
  }

  // Pre-fetch version in background to save time
  const versionPromise = getCompilerVersion(normalizedLang, versionCmd);
  const startTime = performance.now();

  // The command creates the dir, writes code, runs it, then removes the dir.
  // Using () to run in subshell and capture exit code, so cleanup always runs.
  const fullShCmd = `mkdir -p ${workDir} && cd ${workDir} && timeout 15s sh -c '${runCmd.replace(/'/g, "'\\''")}'; exitCode=$?; cd / && rm -rf ${workDir}; exit $exitCode`;
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
        resolve(stdout || 'Execution finished with no output.');
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
    }, 15000);
  });

  const cleanOutput = stripAnsiSequences(output).trimEnd();
  const executionTimeMs = Math.round(performance.now() - startTime);
  const compilerVersion = await versionPromise;

  return {
    output: cleanOutput,
    executionTimeMs,
    compilerVersion
  };
}
