const axios = require('axios');
const Device = require('../models/Device');

exports.getDevices = async (req, res) => {
  try {
    const devices = await Device.find();
    res.json(devices);
  } catch (err) {
    res.status(500).json({ message: 'Server error while fetching devices' });
  }
};

exports.addDevice = async (req, res) => {
  const { ip, hostname, mac } = req.body;

  try {
    const existing = await Device.findOne({ ip });
    if (existing) return res.status(400).json({ message: 'Device already exists' });

    const device = await Device.create({ ip, hostname, mac, status: 'Online' });
    res.status(201).json(device);
  } catch (err) {
    res.status(500).json({ message: 'Error adding device' });
  }
};

exports.getDeviceMonitoringData = async (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ message: 'IP address is required' });

  try {
    // Helper function to fetch data from a specific chart
    const fetchChart = async (chart, options = '') => {
      const url = `http://${ip}:19999/api/v1/data?chart=${chart}&after=-5&points=1&format=json${options}`;
      const response = await axios.get(url);
      if (!response.data || !response.data.labels || !response.data.data?.length)
        throw new Error(`Chart "${chart}" has no valid data.`);
      return response.data;
    };

    // Helper function to fetch general system info
    const fetchInfo = async () => {
      const res = await axios.get(`http://${ip}:19999/api/v1/info`);
      return res.data;
    };

    // --- 1. Fetch all data in parallel ---
    const [systemInfo, cpuChart, ramChart, diskChart, netChart] = await Promise.all([
      fetchInfo(),
      fetchChart('system.cpu'), // Fetch raw CPU values
      fetchChart('system.ram', '&options=percentage'), // Fetch RAM as percentage
      fetchChart('disk_space./', '&options=percentage'), // Fetch Disk as percentage
      fetchChart('system.net') // Fetch raw network values
    ]);

    // --- 2. Extract and Format Hardware/OS Details from System Info ---
    const hostname = systemInfo.mirrored_hosts_status?.[0]?.hostname || 'Unknown';
    const cpuCores = systemInfo.cores_total || 'N/A';
    const osName = systemInfo.os_name || 'Unknown';
    const kernelVersion = systemInfo.kernel_version || '';
    const fullOs = `${osName} ${kernelVersion}`.trim();
    
    // Calculate RAM in GB from bytes (provided by info API)
    const ramTotalBytes = systemInfo.ram_total || 0;
    const ramGb = (ramTotalBytes / (1024 * 1024 * 1024)).toFixed(2);

    // CORRECTED: Use the total_disk_space value directly from the info API
    const diskTotalBytes = systemInfo.total_disk_space || 0;
    const diskGb = (diskTotalBytes / (1024 * 1024 * 1024)).toFixed(2); // Convert bytes to GB

    // --- 3. Calculate Usage Percentages from Chart Data ---
    // CPU: Sum of all non-idle dimensions from raw values
    const cpuUsagePercent = cpuChart.data.at(-1).slice(1).reduce((sum, val) => sum + (val || 0), 0);

    // RAM: Use the 'used' value directly from the percentage chart
    const ramUsagePercent = ramChart.data.at(-1)[ramChart.labels.indexOf('used')] || 0;

    // Disk: Use the 'used' value directly from the percentage chart
    const diskUsagePercent = diskChart.data.at(-1)[diskChart.labels.indexOf('used')] || 0;

    // Network: Sum of 'received' and 'sent' from raw chart (sent is negative)
    const netPoint = netChart.data.at(-1);
    const netIn = netPoint[netChart.labels.indexOf('received')] || 0;
    const netOut = netPoint[netChart.labels.indexOf('sent')] || 0;
    const networkUsageKBps = netIn + Math.abs(netOut);

    // --- 4. Assemble and Send Final Response ---
    return res.json({
      hostname,
      internalIp: ip,
      os: fullOs,
      cpuCores,
      ramTotal: `${ramGb} GB`,
      diskTotal: `${diskGb} GB`,
      cpuUsagePercent: cpuUsagePercent.toFixed(2),
      ramUsagePercent: ramUsagePercent.toFixed(2),
      diskUsagePercent: diskUsagePercent.toFixed(2),
      networkUsageKBps: networkUsageKBps.toFixed(2),
    });

  } catch (err) {
    console.error(`❌ Error fetching monitoring data from ${ip}:`, err.message);
    if (err.message.includes('Chart')) {
        return res.status(500).json({ message: `Failed to fetch data. ${err.message}. Please check if the Netdata agent is running and the chart name is correct.` });
    }
    res.status(500).json({ message: 'Monitoring data fetch failed' });
  }
};