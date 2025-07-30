const axios = require("axios");
const ping = require("ping");
const { exec } = require("child_process");

async function fetchMetrics(ip, hostnameFallback = "Unknown") {
  const isAlive = await ping.promise.probe(ip);
  const status = isAlive.alive ? "Online" : "Offline";

  if (!isAlive.alive) {
    return {
      hostname: hostnameFallback,
      internalIp: ip,
      status: "Offline",
      message: "Device is offline, cannot fetch metrics",
    };
  }

  try {
    const fetchChart = async (chart, options = "") => {
      const url = `http://${ip}:19999/api/v1/data?chart=${chart}&after=-5&points=1&format=json${options}`;
      const response = await axios.get(url);
      if (!response.data?.labels || !response.data.data?.length)
        throw new Error(`Chart "${chart}" has no valid data.`);
      return response.data;
    };

    const fetchInfo = async () => {
      const res = await axios.get(`http://${ip}:19999/api/v1/info`);
      return res.data;
    };

    const [systemInfo, cpuChart, ramChart, diskChart, netChart] =
      await Promise.all([
        fetchInfo(),
        fetchChart("system.cpu"),
        fetchChart("system.ram", "&options=percentage"),
        fetchChart("disk_space./", "&options=percentage"),
        fetchChart("system.net"),
      ]);

    const hostname =
      systemInfo.mirrored_hosts_status?.[0]?.hostname ||
      hostnameFallback ||
      "Unknown";
    const cpuCores = systemInfo.cores_total || "N/A";
    const osName = systemInfo.os_name || "Unknown";
    const kernelVersion = systemInfo.kernel_version || "";
    const fullOs = `${osName} ${kernelVersion}`.trim();
    const ramGb = (systemInfo.ram_total || 0) / (1024 * 1024 * 1024);
    const diskGb = (systemInfo.total_disk_space || 0) / (1024 * 1024 * 1024);

    const cpuUsagePercent = cpuChart.data
      .at(-1)
      .slice(1)
      .reduce((sum, val) => sum + (val || 0), 0);
    const ramUsagePercent =
      ramChart.data.at(-1)[ramChart.labels.indexOf("used")] || 0;
    const diskUsagePercent =
      diskChart.data.at(-1)[diskChart.labels.indexOf("used")] || 0;

    const netPoint = netChart.data.at(-1);
    const netIn = netPoint[netChart.labels.indexOf("received")] || 0;
    const netOut = netPoint[netChart.labels.indexOf("sent")] || 0;
    const networkUsageKBps = netIn + Math.abs(netOut);

    // Nmap: get open ports
    const openPorts = await new Promise((resolve) => {
      exec(`nmap ${ip}`, { timeout: 15000 }, (error, stdout) => {
        if (error) return resolve([]);
        const ports = stdout
          .split("\n")
          .filter((line) => line.match(/^[0-9]+\/tcp.*open/))
          .map((line) => line.trim());
        resolve(ports);
      });
    });

    return {
      hostname,
      internalIp: ip,
      status,
      os: fullOs,
      cpu: {
        cores: cpuCores,
        usagePercent: parseFloat(cpuUsagePercent.toFixed(2)),
      },
      ram: {
        total: `${ramGb.toFixed(2)} GB`,
        usagePercent: parseFloat(ramUsagePercent.toFixed(2)),
      },
      disk: {
        total: `${diskGb.toFixed(2)} GB`,
        usagePercent: parseFloat(diskUsagePercent.toFixed(2)),
      },
      network: {
        usageKBps: parseFloat(networkUsageKBps.toFixed(2)),
      },
      ports: openPorts, // ✅ fixed key name
    };
  } catch (err) {
    return {
      internalIp: ip,
      status,
      hostname: hostnameFallback,
      error: `❌ Failed to fetch metrics: ${err.message}`,
    };
  }
}

module.exports = fetchMetrics;
