import http from 'http';
import fs from 'fs';
import si from 'systeminformation';

export interface DockerContainerInfo {
  id: string;
  name: string;
  image: string;
  version: string;
  status: 'running' | 'stopped' | 'restarting' | 'paused' | 'dead';
  stateString: string;
  health: 'healthy' | 'unhealthy' | 'starting' | 'none';
  cpuPercent: number;
  memoryUsageBytes: number;
  memoryLimitBytes: number;
  memoryPercent: number;
  networkRxBytes: number;
  networkTxBytes: number;
  restartCount: number;
  uptime: string;
  ports: Array<{ hostPort: string; containerPort: string; protocol: string }>;
  mounts: Array<{ source: string; destination: string; mode: string }>;
}

export class DockerService {
  private static socketPath = '/var/run/docker.sock';

  static isDockerAvailable(): boolean {
    return fs.existsSync(this.socketPath);
  }

  static async getDockerSocket(path: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const options = {
        socketPath: this.socketPath,
        path,
        method: 'GET',
        headers: { 'Host': 'docker' }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 400) {
              return reject(new Error(`Docker API responded with status ${res.statusCode}: ${data}`));
            }
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.setTimeout(5000, () => {
        req.destroy(new Error('Docker API request timeout'));
      });
      req.end();
    });
  }

  static async getContainers(): Promise<{
    available: boolean;
    total: number;
    running: number;
    stopped: number;
    unhealthy: number;
    containers: DockerContainerInfo[];
  }> {
    if (!this.isDockerAvailable()) {
      return {
        available: false,
        total: 0,
        running: 0,
        stopped: 0,
        unhealthy: 0,
        containers: []
      };
    }

    try {
      // 1. Get raw container list from docker socket
      const rawContainers: any[] = await this.getDockerSocket('/containers/json?all=1');
      const statsList = await si.dockerContainerStats('*').catch(() => []);

      const containers: DockerContainerInfo[] = [];
      let runningCount = 0;
      let stoppedCount = 0;
      let unhealthyCount = 0;

      for (const c of rawContainers) {
        const id = (c.Id || '').substring(0, 12);
        const name = (c.Names && c.Names[0]) ? c.Names[0].replace(/^\//, '') : id;
        const image = c.Image || 'unknown';
        const imageParts = image.split(':');
        const version = imageParts.length > 1 ? imageParts[imageParts.length - 1] : 'latest';

        const state = c.State ? c.State.toLowerCase() : 'stopped';
        let status: 'running' | 'stopped' | 'restarting' | 'paused' | 'dead' = 'stopped';
        if (state === 'running') {
          status = 'running';
          runningCount++;
        } else if (state === 'restarting') {
          status = 'restarting';
          stoppedCount++;
        } else if (state === 'paused') {
          status = 'paused';
          stoppedCount++;
        } else if (state === 'dead') {
          status = 'dead';
          stoppedCount++;
        } else {
          status = 'stopped';
          stoppedCount++;
        }

        // Health detection
        let health: 'healthy' | 'unhealthy' | 'starting' | 'none' = 'none';
        const statusStr = c.Status ? c.Status.toLowerCase() : '';
        if (statusStr.includes('(healthy)')) {
          health = 'healthy';
        } else if (statusStr.includes('(unhealthy)')) {
          health = 'unhealthy';
          unhealthyCount++;
        } else if (statusStr.includes('(health: starting)')) {
          health = 'starting';
        }

        // Ports formatting
        const ports = (c.Ports || []).map((p: any) => ({
          hostPort: p.PublicPort ? `${p.PublicPort}` : '',
          containerPort: `${p.PrivatePort}`,
          protocol: p.Type || 'tcp'
        }));

        // Mounts formatting
        const mounts = (c.Mounts || []).map((m: any) => ({
          source: m.Source || '',
          destination: m.Destination || '',
          mode: m.Mode || 'rw'
        }));

        // Get matching stats from systeminformation or default
        const containerStat = statsList.find((s: any) => s.id.startsWith(id) || id.startsWith(s.id));
        const cpuPercent = containerStat ? Math.round((containerStat.cpuPercent || 0) * 10) / 10 : 0;
        const memUsage = containerStat ? containerStat.memUsage || 0 : 0;
        const memLimit = containerStat ? containerStat.memLimit || (12 * 1024 * 1024 * 1024) : (12 * 1024 * 1024 * 1024);
        const memPercent = containerStat ? Math.round((containerStat.memPercent || 0) * 10) / 10 : 0;
        const netRx = containerStat ? (containerStat.netIO as any)?.rx || 0 : 0;
        const netTx = containerStat ? (containerStat.netIO as any)?.wx || (containerStat.netIO as any)?.tx || 0 : 0;

        containers.push({
          id,
          name,
          image,
          version,
          status,
          stateString: c.Status || state,
          health,
          cpuPercent,
          memoryUsageBytes: memUsage,
          memoryLimitBytes: memLimit,
          memoryPercent: memPercent,
          networkRxBytes: netRx,
          networkTxBytes: netTx,
          restartCount: typeof c.RestartCount === 'number' ? c.RestartCount : 0,
          uptime: c.Status || '',
          ports,
          mounts
        });
      }

      return {
        available: true,
        total: containers.length,
        running: runningCount,
        stopped: stoppedCount,
        unhealthy: unhealthyCount,
        containers
      };
    } catch (err) {
      console.error('Error querying Docker engine:', err);
      return {
        available: false,
        total: 0,
        running: 0,
        stopped: 0,
        unhealthy: 0,
        containers: []
      };
    }
  }

  static async getContainerLogs(containerId: string, lines: number = 100): Promise<string> {
    if (!this.isDockerAvailable()) {
      return 'Docker daemon indisponível.';
    }

    if (!containerId || !/^[a-zA-Z0-9_\-\.]+$/.test(containerId)) {
      return 'ID de container inválido.';
    }

    const safeLines = Math.min(500, Math.max(10, parseInt(String(lines), 10) || 100));

    return new Promise((resolve) => {
      const options = {
        socketPath: this.socketPath,
        path: `/containers/${encodeURIComponent(containerId)}/logs?stdout=1&stderr=1&tail=${safeLines}&timestamps=1`,
        method: 'GET',
        headers: { 'Host': 'docker' }
      };

      const req = http.request(options, (res) => {
        let rawData = Buffer.alloc(0);
        res.on('data', (chunk) => {
          rawData = Buffer.concat([rawData, chunk]);
        });
        res.on('end', () => {
          // Docker logs prefix lines with 8-byte header (stream type + size)
          // Clean standard docker log binary framing
          let cleanLogs = '';
          let offset = 0;
          while (offset < rawData.length) {
            if (offset + 8 <= rawData.length) {
              const frameSize = rawData.readUInt32BE(offset + 4);
              const message = rawData.subarray(offset + 8, offset + 8 + frameSize).toString('utf-8');
              cleanLogs += message;
              offset += 8 + frameSize;
            } else {
              cleanLogs += rawData.subarray(offset).toString('utf-8');
              break;
            }
          }
          resolve(cleanLogs || rawData.toString('utf-8'));
        });
      });

      req.on('error', (err) => resolve(`Erro ao obter logs: ${err.message}`));
      req.setTimeout(5000, () => {
        req.destroy();
        resolve('Timeout ao obter logs do container.');
      });
      req.end();
    });
  }

  static async inspectContainer(containerId: string): Promise<any> {
    if (!this.isDockerAvailable()) return null;
    if (!containerId || !/^[a-zA-Z0-9_\-\.]+$/.test(containerId)) return null;
    try {
      const data = await this.getDockerSocket(`/containers/${encodeURIComponent(containerId)}/json`);
      return data;
    } catch (err) {
      return null;
    }
  }
}
