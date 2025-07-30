import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DeviceMetrics from "../components/DeviceMetrics";
import ExportControls from "../components/ExportControls";
import Chatbot from "../components/Chatbot"; 

const ItAdminDashboard = () => {
  const { logout, user, token } = useContext(AuthContext);
  const navigate = useNavigate();

  const [devices, setDevices] = useState([]);
  const [monitoringData, setMonitoringData] = useState({});
  const [newDeviceIp, setNewDeviceIp] = useState("");
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [errorAdd, setErrorAdd] = useState(null);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [metricsDeviceIp, setMetricsDeviceIp] = useState(null);
  const [metricsHistory, setMetricsHistory] = useState({});
  const [scanningIp, setScanningIp] = useState(null);
  const [vulnScanResult, setVulnScanResult] = useState({});
  const [successAdd, setSuccessAdd] = useState("");

  useEffect(() => {
    if (!user || !token) {
      navigate("/login");
    } else if (user.role !== "IT Admin") {
      navigate("/unauthorized");
    }
  }, [user, token, navigate]);

  const fetchDevices = async () => {
    setLoadingDevices(true);
    try {
      const res = await axios.get("http://localhost:5000/api/devices", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDevices(res.data || []);
    } catch (err) {
      console.error("Error fetching devices:", err);
    } finally {
      setLoadingDevices(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDevices();
    }
  }, [token]);

  useEffect(() => {
    if (!devices.length) {
      setMonitoringData({});
      return;
    }

    const fetchMonitoringData = async () => {
      try {
        const results = {};
        for (const device of devices) {
          if (!device.ip) continue;
          try {
            const res = await axios.post(
              "http://localhost:5000/api/devices/monitor",
              { ip: device.ip },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            results[device.ip] = res.data;
          } catch (monitorError) {
            console.error(`Could not monitor device ${device.ip}:`, monitorError.message);
            results[device.ip] = { ...monitoringData[device.ip], status: 'Offline' };
          }
        }

        setMonitoringData(results);

        setMetricsHistory((prevHistory) => {
          const updatedHistory = { ...prevHistory };
          for (const device of devices) {
            if (!device.ip || !results[device.ip] || results[device.ip].status === 'Offline') continue;
            const data = results[device.ip];
            const timestamp = new Date().toLocaleTimeString();
            const historyEntry = {
              time: timestamp,
              cpu: data.cpuUsagePercent,
              ram: data.ramUsagePercent,
              network: data.networkUsageKBps,
            };
            const existing = updatedHistory[device.ip] || [];
            const trimmed = [...existing, historyEntry].slice(-20);
            updatedHistory[device.ip] = trimmed;
          }
          return updatedHistory;
        });
      } catch (err) {
        console.error("Error fetching monitoring data:", err);
      }
    };

    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 10000);
    return () => clearInterval(interval);
  }, [devices, token]);

  const handleAddDevice = async (e) => {
    e.preventDefault();
    if (!newDeviceIp.trim()) {
      setErrorAdd("Device IP cannot be empty.");
      return;
    }
    setLoadingAdd(true);
    setErrorAdd(null);
    setSuccessAdd("");
    try {
      await axios.post(
        "http://localhost:5000/api/devices/add",
        { ip: newDeviceIp.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessAdd(`Device ${newDeviceIp} added successfully.`);
      setNewDeviceIp("");
      await fetchDevices();
    } catch (err) {
      setErrorAdd(err.response?.data?.message || "Failed to add device.");
    } finally {
      setLoadingAdd(false);
    }
  };

  const enrichedDeviceData = devices.map(device => {
    const liveData = monitoringData[device.ip] || {};
    const displayData = { ...device, ...liveData };
    
    return {
      ...displayData,
      internalIp: liveData.internalIp || device.ip,
      vulnerabilities: vulnScanResult[device.ip] || 'Not Scanned',
      ports: liveData.basicScan?.openPorts || device.basicScan?.openPorts || [],
    };
  });
  
  if (!user || !token) {
    return <p className="p-8 text-center">Loading...</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex justify-between items-center px-8 py-4 bg-white shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-blue-800">IT Admin Dashboard</h1>
          <p className="text-sm text-gray-600">Welcome, {user.username || "User"}</p>
        </div>
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>

      <div className="p-8">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6">Dashboard Overview</h2>
        
        <form onSubmit={handleAddDevice} className="mb-6 p-4 border rounded bg-white shadow">
            <h2 className="text-lg font-semibold mb-4">Add New Device</h2>
            <div className="flex items-center space-x-4">
                <input type="text" placeholder="Enter new device IP" value={newDeviceIp} onChange={(e) => setNewDeviceIp(e.target.value)} className="border border-gray-300 rounded px-3 py-2 w-64" disabled={loadingAdd} />
                <button type="submit" disabled={loadingAdd} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50">
                    {loadingAdd ? "Adding..." : "Add Device"}
                </button>
            </div>
            {errorAdd && <p className="text-red-600 mt-2">{errorAdd}</p>}
            {successAdd && <p className="text-green-600 mt-2">{successAdd}</p>}
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <OverviewCard title="Total Devices" value={devices.length} />
          <OverviewCard title="Online Devices" value={enrichedDeviceData.filter((d) => d.status === "Online").length} />
          <OverviewCard title="Offline Devices" value={enrichedDeviceData.filter((d) => d.status !== "Online").length} />
        </div>

        {loadingDevices ? (
          <p>Loading devices...</p>
        ) : (
          <div className="bg-white shadow rounded-lg p-6 overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-700">Discovered Devices</h3>
              <ExportControls deviceData={enrichedDeviceData} metricsHistory={metricsHistory} disabled={!devices.length} />
            </div>
            <div className="overflow-auto max-h-[400px]">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-600">
                    <th className="border px-4 py-2 text-left">IP Address</th>
                    <th className="border px-4 py-2 text-left">Hostname</th>
                    <th className="border px-4 py-2 text-left">Status</th>
                    <th className="border px-4 py-2 text-left">CPU %</th>
                    <th className="border px-4 py-2 text-left">RAM %</th>
                    <th className="border px-4 py-2 text-left">Disk %</th>
                    <th className="border px-4 py-2 text-left">Network (KB/s)</th>
                    <th className="border px-4 py-2 text-left">Open Ports</th>
                    <th className="border px-4 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.length === 0 && (
                    <tr><td colSpan="9" className="text-center py-4 text-gray-500">No devices found.</td></tr>
                  )}
                  {enrichedDeviceData.map((device) => (
                      <tr key={device._id} className={device.status === "Offline" ? "bg-red-50" : "bg-white"}>
                        <td className="border px-4 py-2">{device.ip || "-"}</td>
                        <td className="border px-4 py-2">{device.hostname || "-"}</td>
                        <td className={`border px-4 py-2 font-semibold ${device.status === "Online" ? "text-green-600" : "text-red-600"}`}>
                          {device.status || "Unknown"}
                        </td>
                        <td className="border px-4 py-2">{device.cpuUsagePercent ?? "-"}</td>
                        <td className="border px-4 py-2">{device.ramUsagePercent ?? "-"}</td>
                        <td className="border px-4 py-2">{device.diskUsagePercent ?? "-"}</td>
                        <td className="border px-4 py-2">{device.networkUsageKBps != null ? `${device.networkUsageKBps} kbps` : "-"}</td>
                        <td className="border px-4 py-2">
                          {device.ports && device.ports.length > 0 ? (
                            <pre className="whitespace-pre-wrap font-mono text-xs">{device.ports.join("\n")}</pre>
                          ) : "N/A"}
                        </td>
                        <td className="border px-4 py-2">
                          {device.status === "Online" && (
                            <div className="flex flex-wrap gap-2">
                              <button className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700" onClick={() => setMetricsDeviceIp(ip => ip === device.ip ? null : device.ip)}>Metrics</button>
                              <button className="bg-yellow-600 text-white px-3 py-1 rounded text-xs hover:bg-yellow-700" onClick={async () => {
                                setScanningIp(device.ip);
                                try {
                                  const res = await axios.post("http://localhost:5000/api/vuln-scan", { ip: device.ip }, { headers: { Authorization: `Bearer ${token}` } });
                                  setVulnScanResult((prev) => ({ ...prev, [device.ip]: res.data.output }));
                                } catch (err) { alert("Vulnerability scan failed."); } 
                                finally { setScanningIp(null); }
                              }}>
                                {scanningIp === device.ip ? "Scanning..." : "Vuln Scan"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {Object.keys(vulnScanResult).length > 0 && (
          <div className="bg-white shadow rounded-lg p-6 mt-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-700">Vulnerability Scan Results</h3>
            {Object.entries(vulnScanResult).map(([ip, result]) => (
              <div key={ip} className="mb-4">
                <h4 className="font-semibold text-blue-700 mb-2">{ip}</h4>
                <pre className="bg-gray-100 p-4 rounded overflow-auto whitespace-pre-wrap text-sm">{result}</pre>
              </div>
            ))}
          </div>
        )}
        {metricsDeviceIp && (
          <DeviceMetrics ip={metricsDeviceIp} monitoringData={monitoringData} metricsHistory={metricsHistory} onClose={() => setMetricsDeviceIp(null)} />
        )}
      </div>
      <Chatbot /> 
    </div>
  );
};

const OverviewCard = ({ title, value }) => (
  <div className="bg-white shadow rounded-lg p-6 flex flex-col items-center justify-center">
    <p className="text-gray-500 uppercase tracking-wide text-sm font-semibold mb-2">{title}</p>
    <p className="text-3xl font-bold text-gray-900">{value}</p>
  </div>
);

export default ItAdminDashboard;
