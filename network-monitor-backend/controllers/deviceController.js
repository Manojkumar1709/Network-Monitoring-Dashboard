const Device = require("../models/Device");
const { exec } = require("child_process");
const ping = require("ping");
const axios = require("axios");

// --- Helper function to dynamically find the root disk chart ---
const findRootDiskChart = (chartKeys) => {
  const commonNames = ["disk_space./", "disk_space._"];
  for (const name of commonNames) {
    if (chartKeys.includes(name)) return name;
  }
  const diskCharts = chartKeys.filter((key) => key.startsWith("disk_space."));
  if (diskCharts.length > 0) {
    diskCharts.sort((a, b) => a.length - b.length);
    return diskCharts[0];
  }
  return null;
};

// ✅ Add device
exports.addDevice = async (req, res) => {
  const { ip } = req.body;
  if (
    !/^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(
      ip
    )
  ) {
    return res.status(400).json({ message: "Invalid IP address format" });
  }
  if (await Device.findOne({ ip })) {
    return res.status(400).json({ message: "Device already added." });
  }
  if (!(await ping.promise.probe(ip)).alive) {
    return res.status(400).json({ message: "Device is offline. Cannot add." });
  }

  try {
    const chartsResponse = await axios.get(`http://${ip}:19999/api/v1/charts`);
    const chartKeys = Object.keys(chartsResponse.data.charts);
    const diskChartName = findRootDiskChart(chartKeys);
    if (!diskChartName) {
      return res.status(404).json({
        message: "Could not find a valid root disk chart on the device.",
      });
    }

    const fetchChart = (chart, options = "") =>
      axios
        .get(
          `http://${ip}:19999/api/v1/data?chart=${chart}&after=-5&points=1&format=json${options}`
        )
        .then((r) => r.data);
    const fetchInfo = () =>
      axios.get(`http://${ip}:19999/api/v1/info`).then((r) => r.data);

    const [systemInfo, cpuChart, ramChart, diskChart, netChart] =
      await Promise.all([
        fetchInfo(),
        fetchChart("system.cpu"),
        fetchChart("system.ram", "&options=percentage"),
        fetchChart(diskChartName, "&options=percentage"),
        fetchChart("system.net"),
      ]);

    const hostname = chartsResponse.data.hostname || "Unknown";
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
    const networkUsageKBps =
      (netPoint[netChart.labels.indexOf("received")] || 0) +
      Math.abs(netPoint[netChart.labels.indexOf("sent")] || 0);

    const nmapOutput = await new Promise((resolve) => {
      exec(`nmap ${ip}`, { timeout: 15000 }, (error, stdout) => {
        if (error) {
          resolve({ openPorts: ["Scan Failed"] });
        } else {
          const openPorts = stdout
            .split("\n")
            .filter((line) => line.match(/^[0-9]+\/tcp.*open/))
            .map((line) => line.trim());
          resolve({ openPorts });
        }
      });
    });

    const newDevice = new Device({
      ip,
      status: "Online",
      hostname,
      os: fullOs,
      cpuCores: cpuCores.toString(),
      ramTotal: `${ramGb.toFixed(2)} GB`,
      diskTotal: `${diskGb.toFixed(2)} GB`,
      cpuUsagePercent: cpuUsagePercent.toFixed(2),
      ramUsagePercent: ramUsagePercent.toFixed(2),
      diskUsagePercent: diskUsagePercent.toFixed(2),
      networkUsageKBps: networkUsageKBps.toFixed(2),
      basicScan: nmapOutput,
      lastUpdated: new Date(),
    });

    const savedDevice = await newDevice.save();
    res
      .status(201)
      .json({ message: "Device added and scanned", device: savedDevice });
  } catch (error) {
    console.error("Failed to add device:", error.message);
    res.status(500).json({ message: `Failed to add device. ${error.message}` });
  }
};

// ✅ Monitor single device (now returns a full, updated object)
exports.getDeviceMonitoringData = async (req, res) => {
  const { ip } = req.body;
  try {
    const deviceInDb = await Device.findOne({ ip });
    if (!deviceInDb) {
      return res.status(404).json({ message: "Device not found" });
    }

    const isAlive = await ping.promise.probe(ip);
    if (!isAlive.alive) {
      await Device.updateOne({ ip }, { $set: { status: "Offline" } });
      const offlineData = deviceInDb.toObject();
      offlineData.status = "Offline";
      return res.json(offlineData);
    }

    const chartsResponse = await axios.get(`http://${ip}:19999/api/v1/charts`);
    const chartKeys = Object.keys(chartsResponse.data.charts);
    const diskChartName = findRootDiskChart(chartKeys);

    if (!diskChartName) {
      const onlineData = deviceInDb.toObject();
      onlineData.status = "Online";
      onlineData.error = "Could not find root disk chart";
      return res.json(onlineData);
    }

    const fetchChart = (chart, options = "") =>
      axios
        .get(
          `http://${ip}:19999/api/v1/data?chart=${chart}&after=-5&points=1&format=json${options}`
        )
        .then((r) => r.data);
    const fetchInfo = () =>
      axios.get(`http://${ip}:19999/api/v1/info`).then((r) => r.data);

    const [systemInfo, cpuChart, ramChart, diskChart, netChart] =
      await Promise.all([
        fetchInfo(),
        fetchChart("system.cpu"),
        fetchChart("system.ram", "&options=percentage"),
        fetchChart(diskChartName, "&options=percentage"),
        fetchChart("system.net"),
      ]);

    const cpuUsagePercent = cpuChart.data
      .at(-1)
      .slice(1)
      .reduce((sum, val) => sum + (val || 0), 0);
    const ramUsagePercent =
      ramChart.data.at(-1)[ramChart.labels.indexOf("used")] || 0;
    const diskUsagePercent =
      diskChart.data.at(-1)[diskChart.labels.indexOf("used")] || 0;
    const netPoint = netChart.data.at(-1);
    const networkUsageKBps =
      (netPoint[netChart.labels.indexOf("received")] || 0) +
      Math.abs(netPoint[netChart.labels.indexOf("sent")] || 0);

    const updatedData = {
      ...deviceInDb.toObject(), // Start with the stored data
      status: "Online",
      hostname:
        chartsResponse.data.hostname ||
        systemInfo.hostname ||
        deviceInDb.hostname,
      os: `${systemInfo.os_name || ""} ${
        systemInfo.kernel_version || ""
      }`.trim(),
      cpuCores: systemInfo.cores_total || deviceInDb.cpuCores,
      ramTotal: `${((systemInfo.ram_total || 0) / (1024 * 1024 * 1024)).toFixed(
        2
      )} GB`,
      diskTotal: `${(
        (systemInfo.total_disk_space || 0) /
        (1024 * 1024 * 1024)
      ).toFixed(2)} GB`,
      cpuUsagePercent: cpuUsagePercent.toFixed(2),
      ramUsagePercent: ramUsagePercent.toFixed(2),
      diskUsagePercent: diskUsagePercent.toFixed(2),
      networkUsageKBps: networkUsageKBps.toFixed(2),
      lastUpdated: new Date(),
    };

    // Send the complete, merged object back
    res.json(updatedData);
  } catch (err) {
    console.error(`Monitoring error for ${ip}:`, err.message);
    // On failure, still return the stored data but mark as offline
    const deviceInDb = await Device.findOne({ ip });
    if (deviceInDb) {
      const offlineData = deviceInDb.toObject();
      offlineData.status = "Offline";
      offlineData.error = "Failed to fetch live metrics.";
      return res.json(offlineData);
    }
    res.status(500).json({ message: "Monitoring failed", error: err.message });
  }
};

exports.deleteDevice = async (req, res) => {
  // The IP address is now expected in the URL parameter
  const { id: ip } = req.params;
  try {
    // Use findOneAndDelete and query by the 'ip' field
    const deleted = await Device.findOneAndDelete({ ip: ip });

    if (!deleted) {
      return res.status(404).json({ message: "Device not found with that IP" });
    }

    res.json({ message: "Device deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting device:", err.message);
    res.status(500).json({ message: "Failed to delete device" });
  }
};

exports.getDevices = async (req, res) => {
  try {
    const devices = await Device.find({});
    res.json(devices);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch devices" });
  }
};

exports.getAllDeviceMonitoringData = async (req, res) => {
  try {
    const devices = await Device.find();
    res.json(devices);
  } catch (err) {
    res.status(500).json({ message: "Failed to get all device data" });
  }
};

exports.storeDeviceMonitoringData = async (req, res) => {
  res.status(200).json({ message: "Store endpoint is active." });
};

exports.exportDevices = async (req, res) => {
  try {
    const devices = await Device.find().lean();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=devices.json");
    res.status(200).json(devices);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to export devices", error: err.message });
  }
};

exports.runVulnerabilityScan = async (req, res) => {
  const { ip } = req.body;

  if (!ip) {
    return res.status(400).json({ message: "IP address is required" });
  }

  console.log(`Starting Nmap vulnerability scan for ${ip}...`);

  // Execute the Nmap vulnerability script.
  // This can take a long time, so the timeout is increased to 10 minutes (600000 ms).
  exec(
    `nmap -sV --script vuln ${ip}`,
    { timeout: 600000 },
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Nmap vuln scan error for ${ip}:`, error.message);
        // Even if there's an error, send back whatever output was captured
        return res.status(500).json({
          message: "Vulnerability scan failed or timed out.",
          output: stdout || stderr,
        });
      }

      console.log(`Vulnerability scan for ${ip} completed.`);
      res.json({
        message: "Vulnerability scan completed",
        output: stdout,
      });
    }
  );
};
