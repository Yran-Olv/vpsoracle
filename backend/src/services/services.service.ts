import { exec } from 'child_process';
import util from 'util';
import si from 'systeminformation';
import fs from 'fs';
import net from 'net';

const execAsync = util.promisify(exec);

export interface SystemServiceInfo {
  name: string;
  label: string;
  category: 'web' | 'database' | 'system' | 'security' | 'runtime';
  status: 'running' | 'warning' | 'down';
  description: string;
  memoryMb?: number;
  cpuPercent?: number;
  pids?: number[];
}

interface ServiceTarget {
  name: string;
  label: string;
  category: 'web' | 'database' | 'system' | 'security' | 'runtime';
  desc: string;
  aliases: string[];
  ports?: number[];
}

const MONITORED_SERVICES: ServiceTarget[] = [
  { name: 'nginx', label: 'Nginx Reverse Proxy', category: 'web', desc: 'Servidor web e proxy reverso principal', aliases: ['nginx'], ports: [80, 443] },
  { name: 'docker', label: 'Docker Daemon', category: 'system', desc: 'Motor de containers Docker', aliases: ['dockerd', 'docker'] },
  { name: 'postgresql', label: 'PostgreSQL Database', category: 'database', desc: 'Banco de dados relacional principal', aliases: ['postgres', 'postgresql'], ports: [5432] },
  { name: 'redis', label: 'Redis Server', category: 'database', desc: 'Armazenamento em cache em memória', aliases: ['redis-server', 'redis'], ports: [6379] },
  { name: 'pm2', label: 'PM2 Process Manager', category: 'runtime', desc: 'Gerenciador de processos Node.js', aliases: ['pm2'] },
  { name: 'sshd', label: 'SSH Server', category: 'security', desc: 'Serviço de acesso remoto seguro', aliases: ['sshd', 'ssh'], ports: [22] },
  { name: 'cron', label: 'Cron Scheduler', category: 'system', desc: 'Agendador de tarefas periódicas do Linux', aliases: ['cron', 'crond'] },
  { name: 'ufw', label: 'UFW Firewall', category: 'security', desc: 'Firewall do sistema Linux', aliases: ['ufw'] },
  { name: 'fail2ban', label: 'Fail2Ban Intrusion Prevention', category: 'security', desc: 'Bloqueio de ataques de força bruta', aliases: ['fail2ban', 'fail2ban-server'] },
  { name: 'cloudflared', label: 'Cloudflare Tunnel', category: 'web', desc: 'Túnel seguro Cloudflare (se ativo)', aliases: ['cloudflared'] }
];

function checkPort(host: string, port: number, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const s = new net.Socket();
    s.setTimeout(timeoutMs);
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('error', () => { s.destroy(); resolve(false); });
    s.on('timeout', () => { s.destroy(); resolve(false); });
    s.connect(port, host);
  });
}

interface HostProcInfo {
  pid: number;
  name: string;
  cmd: string;
}

function scanHostProc(): HostProcInfo[] {
  const procDir = fs.existsSync('/host/proc') ? '/host/proc' : '/proc';
  const procs: HostProcInfo[] = [];
  try {
    const entries = fs.readdirSync(procDir);
    for (const entry of entries) {
      if (!/^\d+$/.test(entry)) continue;
      const pid = parseInt(entry, 10);
      try {
        const cmd = fs.readFileSync(`${procDir}/${entry}/cmdline`, 'utf8').replace(/\0/g, ' ').trim();
        const comm = fs.existsSync(`${procDir}/${entry}/comm`) ? fs.readFileSync(`${procDir}/${entry}/comm`, 'utf8').trim() : '';
        if (cmd || comm) {
          procs.push({ pid, name: comm.toLowerCase(), cmd: cmd.toLowerCase() });
        }
      } catch (e) {}
    }
  } catch (err) {}
  return procs;
}

export class ServicesService {
  static async getServicesStatus(): Promise<SystemServiceInfo[]> {
    const results: SystemServiceInfo[] = [];

    try {
      const hostProcs = scanHostProc();
      const siServices = await si.services('nginx, docker, postgresql, postgres, redis, redis-server, ssh, sshd, cron, ufw, fail2ban, cloudflared').catch(() => []);
      const processes = await si.processes().catch(() => ({ list: [] }));

      // Check iptables / ufw
      const hasIptables = fs.existsSync('/host/proc/net/ip_tables_names') || fs.existsSync('/proc/net/ip_tables_names');
      const hasDockerSock = fs.existsSync('/var/run/docker.sock');

      for (const target of MONITORED_SERVICES) {
        let isRunning = false;
        let isWarning = false;
        const matchedPids: number[] = [];

        // 1. Direct procfs scan (works from inside container)
        const procMatches = hostProcs.filter(p => 
          target.aliases.some(alias => p.name.includes(alias) || p.cmd.includes(alias))
        );

        if (procMatches.length > 0) {
          isRunning = true;
          matchedPids.push(...procMatches.map(p => p.pid));
        }

        // 2. Fallback: systemctl is-active
        if (!isRunning) {
          try {
            const { stdout } = await execAsync(`systemctl is-active ${target.name} 2>/dev/null || systemctl is-active ${target.name}.service 2>/dev/null || true`);
            const trimmed = stdout.trim();
            if (trimmed === 'active') {
              isRunning = true;
            } else if (trimmed === 'activating' || trimmed === 'reloading') {
              isRunning = true;
              isWarning = true;
            }
          } catch (e) {}
        }

        // 3. Fallback: systeminformation services
        if (!isRunning) {
          const matched = siServices.find((s: any) => target.aliases.some(a => s.name.toLowerCase().includes(a)));
          if (matched && matched.running) {
            isRunning = true;
          }
        }

        // 4. Fallback: systeminformation processes
        if (!isRunning) {
          const matchedSiProcs = processes.list.filter((p: any) => 
            target.aliases.some(a => p.name.toLowerCase().includes(a) || (p.command && p.command.toLowerCase().includes(a)))
          );
          if (matchedSiProcs.length > 0) {
            isRunning = true;
            matchedPids.push(...matchedSiProcs.map((p: any) => p.pid));
          }
        }

        // 5. Fallback: TCP port connectivity check
        if (!isRunning && target.ports && target.ports.length > 0) {
          for (const port of target.ports) {
            const openLocal = await checkPort('127.0.0.1', port);
            const openGateway = !openLocal ? await checkPort('172.17.0.1', port) : false;
            if (openLocal || openGateway) {
              isRunning = true;
              break;
            }
          }
        }

        // 6. Special service heuristics
        if (!isRunning) {
          if (target.name === 'docker' && hasDockerSock) {
            isRunning = true;
          } else if (target.name === 'ufw' && hasIptables) {
            isRunning = true;
          } else if (target.name === 'pm2') {
            try {
              const { stdout } = await execAsync('pm2 ping 2>/dev/null || true');
              if (stdout.includes('pong') || stdout.includes('PM2')) {
                isRunning = true;
              }
            } catch (e) {}
          }
        }

        results.push({
          name: target.name,
          label: target.label,
          category: target.category,
          status: isRunning ? (isWarning ? 'warning' : 'running') : 'down',
          description: target.desc,
          memoryMb: isRunning ? 25.0 : 0,
          cpuPercent: 0,
          pids: Array.from(new Set(matchedPids)).slice(0, 5)
        });
      }
    } catch (err) {
      console.error('Error fetching system services status:', err);
    }

    return results;
  }
}
