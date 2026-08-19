const fs = require('fs');
let c = fs.readFileSync('panel/src/app/(dashboard)/DashboardPageClient.tsx', 'utf8');

const targetStr = `                if (data.type === 'stats.update' && data.core_id) {
                  const stats = data.payload || data; // handle unwrapping
                  
                  const formatUptime = (seconds: number) => {
                    if (!seconds) return "—";
                    const d = Math.floor(seconds / 86400);
                    const h = Math.floor((seconds % 86400) / 3600);
                    const m = Math.floor((seconds % 3600) / 60);
                    const s = Math.floor(seconds % 60);
                    if (d > 0) return \`\${d}d \${h}h \${m}m \${s}s\`;
                    if (h > 0) return \`\${h}h \${m}m \${s}s\`;
                    if (m > 0) return \`\${m}m \${s}s\`;
                    return \`\${s}s\`;
                  };

                  setCores(prev => prev.map(c => {
                    if (c.id === data.core_id) {
                      return {
                        ...c,
                        cpu: stats.cpu_usage || 0,
                        ram: Number(((stats.mem_used || 0) / (1024 * 1024 * 1024)).toFixed(3)),
                        ramTotal: Number(((stats.mem_total || 0) / (1024 * 1024 * 1024)).toFixed(2)),
                        storage: Number(((stats.disk_used || 0) / (1024 * 1024 * 1024)).toFixed(1)),
                        storageTotal: Number(((stats.disk_total || 0) / (1024 * 1024 * 1024)).toFixed(0)),
                        networkSent: stats.net_sent || 0,
                        networkRecv: stats.net_recv || 0,
                        netTotalSent: stats.net_total_sent || 0,
                        netTotalRecv: stats.net_total_recv || 0,
                        uptime: formatUptime(stats.uptime),
                        osName: stats.os_name || c.osName,
                        cpuModel: stats.cpu_model || c.cpuModel,
                        cpuCores: stats.cpu_cores || c.cpuCores,
                        partitions: stats.partitions || [],
                        stats: stats
                      };
                    }
                    return c;
                  }));
                }`;

const replacementStr = `                if (data.type === 'stats.update' && data.core_id) {
                  const stats = data.payload || data; // handle unwrapping
                  
                  const formatUptime = (seconds: number) => {
                    if (!seconds) return "—";
                    const d = Math.floor(seconds / 86400);
                    const h = Math.floor((seconds % 86400) / 3600);
                    const m = Math.floor((seconds % 3600) / 60);
                    const s = Math.floor(seconds % 60);
                    if (d > 0) return \`\${d}d \${h}h \${m}m \${s}s\`;
                    if (h > 0) return \`\${h}h \${m}m \${s}s\`;
                    if (m > 0) return \`\${m}m \${s}s\`;
                    return \`\${s}s\`;
                  };

                  setCores(prev => prev.map(c => {
                    if (c.id === data.core_id) {
                      return {
                        ...c,
                        cpu: stats.cpu_usage || 0,
                        ram: Number(((stats.mem_used || 0) / (1024 * 1024 * 1024)).toFixed(3)),
                        ramTotal: Number(((stats.mem_total || 0) / (1024 * 1024 * 1024)).toFixed(2)),
                        storage: Number(((stats.disk_used || 0) / (1024 * 1024 * 1024)).toFixed(1)),
                        storageTotal: Number(((stats.disk_total || 0) / (1024 * 1024 * 1024)).toFixed(0)),
                        networkSent: stats.net_sent || 0,
                        networkRecv: stats.net_recv || 0,
                        netTotalSent: stats.net_total_sent || 0,
                        netTotalRecv: stats.net_total_recv || 0,
                        uptime: formatUptime(stats.uptime),
                        osName: stats.os_name || c.osName,
                        cpuModel: stats.cpu_model || c.cpuModel,
                        cpuCores: stats.cpu_cores || c.cpuCores,
                        partitions: stats.partitions || c.partitions || [],
                        stats: {
                          ...(c.stats || {}),
                          ...stats,
                          partitions: stats.partitions || c.stats?.partitions || c.partitions || [],
                          docker_images_size: stats.docker_images_size || c.stats?.docker_images_size || 0,
                          docker_logs_size: stats.docker_logs_size || c.stats?.docker_logs_size || 0,
                          docker_storage_size: stats.docker_storage_size || c.stats?.docker_storage_size || 0
                        }
                      };
                    }
                    return c;
                  }));
                }

                if (data.type === 'storage.update' && data.core_id) {
                  const storage = data.payload || data;
                  setCores(prev => prev.map(c => {
                    if (c.id === data.core_id) {
                      const updatedPartitions = storage.partitions || c.partitions || [];
                      return {
                        ...c,
                        partitions: updatedPartitions,
                        stats: {
                          ...(c.stats || {}),
                          partitions: updatedPartitions,
                          docker_images_size: storage.docker_images_size !== undefined ? storage.docker_images_size : (c.stats?.docker_images_size || 0),
                          docker_logs_size: storage.docker_logs_size !== undefined ? storage.docker_logs_size : (c.stats?.docker_logs_size || 0),
                          docker_storage_size: storage.docker_storage_size !== undefined ? storage.docker_storage_size : (c.stats?.docker_storage_size || 0)
                        }
                      };
                    }
                    return c;
                  }));
                }`;

// Clean carriage returns for comparison
const normalize = str => str.replace(/\r\n/g, '\n');
const normalizedContent = normalize(c);
const normalizedTarget = normalize(targetStr);
const normalizedReplacement = normalize(replacementStr);

if (normalizedContent.includes(normalizedTarget)) {
  const index = normalizedContent.indexOf(normalizedTarget);
  const result = normalizedContent.substring(0, index) + normalizedReplacement + normalizedContent.substring(index + normalizedTarget.length);
  // Restore CRLF if file is CRLF format
  const output = c.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result;
  fs.writeFileSync('panel/src/app/(dashboard)/DashboardPageClient.tsx', output);
  console.log("SUCCESS");
} else {
  console.log("TARGET STRING NOT FOUND");
}
