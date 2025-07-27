const Device = require("../models/Device");
const { exec } = require("child_process");
const ping = require("ping");
const axios = require("axios");

// ✅ Add device
exports.addDevice = async (req, res) => {
  const { ip } = req.body;

  const isValidIP = (ip) => {
    const regex =
      /^(25[0-5]|2[0-4]\d|1\d\d|\d\d|\d)\.(25[0-5]|2[0-4]\d|1\d\d|\d\d|\d)\.(25[0-5]|2[0-4]\d|1\d\d|\d\d|\d)\.(25[0-5]|2[0-4]\d|1\d\d|\d\d|\d)$/;
    return regex.test(ip);
  };

  if (!isValidIP(ip)) {
    return res.status(400).json({ message: "Invalid IP address format" });
  }

  // ✅ Check if IP is already added
  const existingDevice = await Device.findOne({ ip });
  if (existingDevice) {
    return res.status(400).json({ message: "Device already added." });
  }

  const pingRes = await ping.promise.probe(ip);
  if (!pingRes.alive) {
    return res.status(400).json({ message: "Device is offline. Cannot add." });
  }

  try {
    // 👇 Inline same logic from getDeviceMonitoringData
    const fetchChart = async (chart, options = "") => {
      const url = `http://${ip}:19999/api/v1/data?chart=${chart}&after=-5&points=1&format=json${options}`;
      const response = await axios.get(url);
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
      systemInfo.mirrored_hosts_status?.[0]?.hostname || "Unknown";
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

    const nmapOutput = await new Promise((resolve) => {
      exec(`nmap ${ip}`, { timeout: 15000 }, (error, stdout) => {
        if (error) {
          resolve("Nmap scan failed or timed out.");
        } else {
          const openPorts = stdout
            .split("\n")
            .filter((line) => line.match(/^[0-9]+\/tcp.*open/))
            .map((line) => line.trim());

          resolve({
            openPorts,
          });
        }
      });
    });

    // 💾 Save full details to DB
    const savedDevice = await Device.findOneAndUpdate(
      { ip },
      {
        ip,
        status: "Online",
        hostname,
        os: fullOs,
        cpuCores,
        ramTotal: `${ramGb.toFixed(2)} GB`,
        diskTotal: `${diskGb.toFixed(2)} GB`,
        cpuUsagePercent: cpuUsagePercent.toFixed(2),
        ramUsagePercent: ramUsagePercent.toFixed(2),
        diskUsagePercent: diskUsagePercent.toFixed(2),
        networkUsageKBps: networkUsageKBps.toFixed(2),
        basicScan: nmapOutput,
      },
      { upsert: true, new: true }
    );

    res.json({ message: "Device added and scanned", device: savedDevice });
  } catch (error) {
    console.error("Failed to monitor during add:", error.message);
    res.status(500).json({ message: "Failed to add and monitor device" });
  }
};

// ✅ Delete device by IP
exports.deleteDevice = async (req, res) => {
  const ip = req.params.id; // IP is passed as 'id' param
  try {
    const deleted = await Device.findOneAndDelete({ ip });
    if (!deleted) {
      return res.status(404).json({ message: "Device not found" });
    }
    res.json({ message: "Device deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting device:", err.message);
    res.status(500).json({ message: "Failed to delete device" });
  }
};

// ✅ List all devices
exports.getDevices = async (req, res) => {
  const devices = await Device.find({});
  res.json(devices);
};

// ✅ Monitor single device
// ✅ Monitor single device (mirrors /monitor-all structure)
exports.getDeviceMonitoringData = async (req, res) => {
  const { ip } = req.body;

  try {
    const isAlive = await ping.promise.probe(ip);
    if (!isAlive.alive) {
      return res.status(400).json({ message: "Device is offline" });
    }

    const fetchChart = async (chart, options = "") => {
      const url = `http://${ip}:19999/api/v1/data?chart=${chart}&after=-5&points=1&format=json${options}`;
      const response = await axios.get(url);
      if (
        !response.data ||
        !response.data.labels ||
        !response.data.data?.length
      )
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
      systemInfo.mirrored_hosts_status?.[0]?.hostname || "Unknown";
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

    // 🔍 Basic Nmap Scan (Open Ports + OS Detection)
    const nmapOutput = await new Promise((resolve) => {
      exec(`nmap ${ip}`, { timeout: 15000 }, (error, stdout) => {
        if (error) {
          resolve("Nmap scan failed or timed out.");
        } else {
          const openPorts = stdout
            .split("\n")
            .filter((line) => line.match(/^[0-9]+\/tcp.*open/))
            .map((line) => line.trim());

          resolve({
            openPorts,
          });
        }
      });
    });

    res.json({
      hostname,
      internalIp: ip,
      os: fullOs,
      status: "Online",
      cpuCores,
      ramTotal: `${ramGb.toFixed(2)} GB`,
      diskTotal: `${diskGb.toFixed(2)} GB`,
      cpuUsagePercent: cpuUsagePercent.toFixed(2),
      ramUsagePercent: ramUsagePercent.toFixed(2),
      diskUsagePercent: diskUsagePercent.toFixed(2),
      networkUsageKBps: networkUsageKBps.toFixed(2),
      basicScan: nmapOutput, // 🔍 append Nmap scan result here
    });
  } catch (err) {
    res.status(500).json({
      message: "Monitoring failed",
      error: err.message,
    });
  }
};



exports.getAllDeviceMonitoringData = async (req, res) => {
  try {
    const devices = await Device.find();
    const results = [];

    for (const device of devices) {
      const ip = device.ip;
      let fullOs = "Unknown";
      let cpuCores = "N/A";
      let cpuUsagePercent = 0;
      let ramGb = 0;
      let ramUsagePercent = 0;
      let diskGb = 0;
      let diskUsagePercent = 0;
      let networkUsageKBps = 0;
      let hostname = device.hostname || "Unknown";
      let nmapPorts = [];

      const isAlive = await ping.promise.probe(ip);
      const status = isAlive.alive ? "Online" : "Offline";

      if (!isAlive.alive) {
        await Device.updateOne({ ip }, { status });
        results.push({
          hostname,
          internalIp: ip,
          status,
          message: "Device is offline, cannot fetch metrics",
        });
        continue;
      }

      try {
        const fetchChart = async (chart, options = "") => {
          const url = `http://${ip}:19999/api/v1/data?chart=${chart}&after=-5&points=1&format=json${options}`;
          const response = await axios.get(url);
          if (!response.data || !response.data.labels || !response.data.data?.length)
            throw new Error(`Chart "${chart}" has no valid data.`);
          return response.data;
        };

        const fetchInfo = async () => {
          const res = await axios.get(`http://${ip}:19999/api/v1/info`);
          return res.data;
        };

        const [systemInfo, cpuChart, ramChart, diskChart, netChart] = await Promise.all([
          fetchInfo(),
          fetchChart("system.cpu"),
          fetchChart("system.ram", "&options=percentage"),
          fetchChart("disk_space./", "&options=percentage"),
          fetchChart("system.net"),
        ]);

        hostname =
          systemInfo.mirrored_hosts_status?.[0]?.hostname ||
          device.hostname ||
          "Unknown";
        cpuCores = systemInfo.cores_total || "N/A";
        const osName = systemInfo.os_name || "Unknown";
        const kernelVersion = systemInfo.kernel_version || "";
        fullOs = `${osName} ${kernelVersion}`.trim();
        ramGb = (systemInfo.ram_total || 0) / (1024 * 1024 * 1024);
        diskGb = (systemInfo.total_disk_space || 0) / (1024 * 1024 * 1024);

        cpuUsagePercent = cpuChart.data.at(-1).slice(1).reduce((sum, val) => sum + (val || 0), 0);
        ramUsagePercent = ramChart.data.at(-1)[ramChart.labels.indexOf("used")] || 0;
        diskUsagePercent = diskChart.data.at(-1)[diskChart.labels.indexOf("used")] || 0;

        const netPoint = netChart.data.at(-1);
        const netIn = netPoint[netChart.labels.indexOf("received")] || 0;
        const netOut = netPoint[netChart.labels.indexOf("sent")] || 0;
        networkUsageKBps = netIn + Math.abs(netOut);

        // Nmap basic scan
        const nmapOutput = await new Promise((resolve) => {
          exec(`nmap ${ip}`, { timeout: 15000 }, (error, stdout) => {
            if (error) return resolve([]);
            const openPorts = stdout
              .split("\n")
              .filter((line) => line.match(/^[0-9]+\/tcp.*open/))
              .map((line) => line.trim());
            resolve(openPorts);
          });
        });

        nmapPorts = nmapOutput;

        // Update DB dynamically
        await Device.updateOne(
          { ip },
          {
            $set: {
              hostname,
              status: "Online",
              os: fullOs,
              cpu: { usagePercent: cpuUsagePercent.toFixed(2), cores: cpuCores },
              ram: {
                total: ramGb.toFixed(2),
                usagePercent: ramUsagePercent.toFixed(2),
              },
              disk: {
                total: diskGb.toFixed(2),
                usagePercent: diskUsagePercent.toFixed(2),
              },
              ports: nmapPorts,
              lastUpdated: new Date(),
            },
          },
          { upsert: true }
        );

        results.push({
          hostname,
          internalIp: ip,
          os: fullOs,
          status: "Online",
          cpuCores,
          ramTotal: `${ramGb.toFixed(2)} GB`,
          diskTotal: `${diskGb.toFixed(2)} GB`,
          cpuUsagePercent: cpuUsagePercent.toFixed(2),
          ramUsagePercent: ramUsagePercent.toFixed(2),
          diskUsagePercent: diskUsagePercent.toFixed(2),
          networkUsageKBps: networkUsageKBps.toFixed(2),
          basicScan: nmapPorts,
        });
      } catch (err) {
        results.push({
          internalIp: ip,
          status: "Online",
          hostname,
          error: `❌ Failed to fetch metrics: ${err.message}`,
        });
      }
    }

    res.json(results);
  } catch (err) {
    console.error(`❌ Error fetching devices:`, err.message);
    res.status(500).json({ message: "Failed to fetch device monitoring data" });
  }
};


exports.storeDeviceMonitoringData = async (req, res) => {
  try {
    const devices = req.body; // Array of device monitoring objects
    const results = [];

    for (const device of devices) {
      if (device.status === "Online") {
        const {
          internalIp,
          hostname,
          os,
          cpuCores,
          ramTotal,
          diskTotal,
          cpuUsagePercent,
          ramUsagePercent,
          diskUsagePercent,
          networkUsageKBps,
          basicScan,
        } = device;

        const updatedDevice = await Device.findOneAndUpdate(
          { ip: internalIp },
          {
            $set: {
              ip: internalIp,
              status: "Online",
              hostname,
              os,
              cpuCores,
              ramTotal,
              diskTotal,
              cpuUsagePercent,
              ramUsagePercent,
              diskUsagePercent,
              networkUsageKBps,
              basicScan,
            },
          },
          { upsert: true, new: true }
        );

        results.push(updatedDevice);
      }
    }

    res.status(200).json({
      message: `${results.length} online device(s) stored/updated successfully.`,
      data: results,
    });
  } catch (error) {
    console.error("Error storing devices:", error.message);
    res.status(500).json({ error: "Failed to store/update devices" });
  }
};
