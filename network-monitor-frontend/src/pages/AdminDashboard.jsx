import { useEffect, useState, useContext, Fragment } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import TerminalModal from "../components/TerminalModal";
import DeviceMetrics from "../components/DeviceMetrics";
import ExportControls from "../components/ExportControls";
import Chatbot from "../components/Chatbot";

const AdminDashboard = () => {
  const { logout, user, token } = useContext(AuthContext);
  const navigate = useNavigate();

  const [devices, setDevices] = useState([]);
  const [monitoringData, setMonitoringData] = useState({});
  const [newDeviceIp, setNewDeviceIp] = useState("");
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [errorAdd, setErrorAdd] = useState(null);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [selectedDeviceIp, setSelectedDeviceIp] = useState(null);
  const [metricsDeviceIp, setMetricsDeviceIp] = useState(null);
  const [metricsHistory, setMetricsHistory] = useState({});
  const [scanningIp, setScanningIp] = useState(null);
  const [vulnScanResult, setVulnScanResult] = useState({});
  const [successAdd, setSuccessAdd] = useState("");

  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("User");

  useEffect(() => {
    if (!user || !token) {
      navigate("/login");
    } else if (user.role !== "Admin") {
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
          const res = await axios.post(
            "http://localhost:5000/api/devices/monitor",
            { ip: device.ip },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          results[device.ip] = res.data;
        }
        setMonitoringData(results);
        setMetricsHistory((prevHistory) => {
          const updatedHistory = { ...prevHistory };
          for (const device of devices) {
            if (!device.ip) continue;
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
    if (!token) {
      setErrorAdd("Authorization token is missing.");
      return;
    }
    setLoadingAdd(true);
    setErrorAdd(null);
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
      console.error("❌ Add device error:", err.response || err.message);
      setErrorAdd(
        err.response?.data?.message || "Failed to add device. Check logs."
      );
    } finally {
      setLoadingAdd(false);
    }
  };

  const handleAddUser = () => {
    if (!newUserEmail.trim()) {
      alert("Please enter a valid email");
      return;
    }
    alert(`Added ${newUserRole} with email: ${newUserEmail} (static demo)`);
    setNewUserEmail("");
    setNewUserRole("User");
  };

  const enrichedDeviceData = devices.map((device) => ({
    ...device,
    ...(monitoringData[device.ip] || {}),
    vulnerabilities: vulnScanResult[device.ip] || "Not Scanned",
    internalIp:
      (monitoringData[device.ip] && monitoringData[device.ip].internalIp) ||
      device.ip,
  }));

  if (!user || !token) {
    return <p className="p-8 text-center">Loading...</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex justify-between items-center px-8 py-4 bg-white shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-blue-800">
            Network Dashboard
          </h1>
          <p className="text-sm text-gray-600">
            Welcome, {user.username || "User"}
          </p>
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
        <h2 className="text-3xl font-semibold text-gray-800 mb-6">
          Dashboard Overview
        </h2>

        {/* Add User Form */}
        <div className="mb-6 p-4 border rounded bg-white shadow">
          <h2 className="text-lg font-semibold mb-4">Add IT Admin / User</h2>
          <div className="flex flex-wrap gap-4 items-center">
            <input
              type="email"
              placeholder="Enter email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              className="border p-2 rounded w-full sm:w-auto flex-grow"
            />
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value)}
              className="border p-2 rounded"
            >
              <option value="User">User</option>
              <option value="IT Admin">IT Admin</option>
            </select>
            <button
              onClick={handleAddUser}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Add
            </button>
          </div>
        </div>

        {/* Add Device Form */}
        <form
          onSubmit={handleAddDevice}
          className="mb-6 flex items-center space-x-4"
        >
          {errorAdd && <p className="text-red-500 mb-2">{errorAdd}</p>}
          {successAdd && <p className="text-green-600 mb-2">{successAdd}</p>}
          <input
            type="text"
            placeholder="Enter new device IP"
            value={newDeviceIp}
            onChange={(e) => setNewDeviceIp(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-64"
            disabled={loadingAdd}
          />
          <button
            type="submit"
            disabled={loadingAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loadingAdd ? "Adding..." : "Add Device"}
          </button>
        </form>
        {errorAdd && <p className="text-red-600 mb-4">{errorAdd}</p>}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <OverviewCard title="Total Devices" value={devices.length} />
          <OverviewCard
            title="Online Devices"
            value={devices.filter((d) => d.status === "Online").length}
          />
          <OverviewCard
            title="Offline Devices"
            value={devices.filter((d) => d.status === "Offline").length}
          />
        </div>

        {/* Devices Table */}
        {loadingDevices ? (
          <p>Loading devices...</p>
        ) : (
          <div className="bg-white shadow rounded-lg p-6 overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-700">
                Discovered Devices
              </h3>
              <ExportControls
                deviceData={enrichedDeviceData}
                metricsHistory={metricsHistory}
                disabled={!devices.length}
              />
            </div>

            <div className="overflow-auto max-h-[60vh]">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-600">
                    <th className="border px-4 py-2 text-left">IP Address</th>
                    <th className="border px-4 py-2 text-left">Hostname</th>
                    <th className="border px-4 py-2 text-left">Status</th>
                    <th className="border px-4 py-2 text-left">CPU %</th>
                    <th className="border px-4 py-2 text-left">RAM %</th>
                    <th className="border px-4 py-2 text-left">Disk %</th>
                    <th className="border px-4 py-2 text-left">Network kbps</th>
                    <th className="border px-4 py-2 text-left">Open Ports</th>
                    <th className="border px-4 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.length === 0 && (
                    <tr>
                      <td
                        colSpan="9"
                        className="text-center py-4 text-gray-500"
                      >
                        No devices found.
                      </td>
                    </tr>
                  )}
                  {devices.map(({ _id, ip, hostname, status }) => {
                    const monitor = monitoringData[ip] || {};
                    return (
                      <Fragment key={_id}>
                        <tr
                          className={
                            status === "Offline" ? "bg-red-50" : "bg-white"
                          }
                        >
                          <td className="border px-4 py-2">{ip || "-"}</td>
                          <td className="border px-4 py-2">
                            {hostname || "-"}
                          </td>
                          <td
                            className={`border px-4 py-2 font-semibold ${
                              status === "Online"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {status || "-"}
                          </td>
                          <td className="border px-4 py-2">
                            {monitor.cpuUsagePercent ?? "-"}
                          </td>
                          <td className="border px-4 py-2">
                            {monitor.ramUsagePercent ?? "-"}
                          </td>
                          <td className="border px-4 py-2">
                            {monitor.diskUsagePercent ?? "-"}
                          </td>
                          <td className="border px-4 py-2">
                            {monitor.networkUsageKBps != null
                              ? `${monitor.networkUsageKBps} kbps`
                              : "-"}
                          </td>
                          <td className="border px-4 py-2">
                            {monitor.basicScan?.openPorts?.length > 0 ? (
                              <pre className="whitespace-pre-wrap font-mono text-xs">
                                {monitor.basicScan.openPorts
                                  .map((entry) => {
                                    const [port, state, service] = entry
                                      .trim()
                                      .split(/\s+/);
                                    return `${port.padEnd(10)} ${state.padEnd(
                                      10
                                    )} ${service}`;
                                  })
                                  .join("\n")}
                              </pre>
                            ) : (
                              "N/A"
                            )}
                          </td>
                          <td className="border px-4 py-2">
                            {status === "Online" && (
                              <>
                                <button
                                  className="bg-gray-800 text-white px-3 py-1 rounded text-xs hover:bg-gray-900 mb-1"
                                  onClick={() => setSelectedDeviceIp(ip)}
                                >
                                  Terminal
                                </button>
                                <button
                                  className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 mb-1 ml-1"
                                  onClick={() =>
                                    setMetricsDeviceIp(
                                      ip === metricsDeviceIp ? null : ip
                                    )
                                  }
                                >
                                  Metrics
                                </button>
                                <button
                                  className="bg-yellow-600 text-white px-3 py-1 rounded text-xs hover:bg-yellow-700 ml-1"
                                  disabled={scanningIp === ip}
                                  onClick={async () => {
                                    setScanningIp(ip);
                                    try {
                                      const res = await axios.post(
                                        "http://localhost:5000/api/devices/vuln-scan",
                                        { ip },
                                        {
                                          headers: {
                                            Authorization: `Bearer ${token}`,
                                          },
                                        } // ✅ Added Auth Header
                                      );
                                      setVulnScanResult((prev) => ({
                                        ...prev,
                                        [ip]: res.data.output,
                                      }));
                                    } catch (err) {
                                      console.error(
                                        "Vulnerability scan failed:",
                                        err
                                      );
                                      alert(
                                        "Vulnerability scan failed. Check backend logs."
                                      );
                                    } finally {
                                      setScanningIp(null);
                                    }
                                  }}
                                >
                                  {scanningIp === ip
                                    ? "Scanning..."
                                    : "Vuln Scan"}
                                </button>
                                <button
                                  className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 ml-1 mt-1"
                                  onClick={async () => {
                                    if (
                                      window.confirm(`Delete device ${ip}?`)
                                    ) {
                                      try {
                                        await axios.delete(
                                          `http://localhost:5000/api/devices/${ip}`,
                                          {
                                            headers: {
                                              Authorization: `Bearer ${token}`,
                                            },
                                          }
                                        );
                                        fetchDevices();
                                      } catch (err) {
                                        console.error(
                                          "Failed to delete device:",
                                          err
                                        );
                                        alert("Failed to delete device.");
                                      }
                                    }
                                  }}
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                        {/* ✅ FIX: Show scan result directly below the device row */}
                        {vulnScanResult[ip] && (
                          <tr className="bg-gray-50">
                            <td colSpan="9" className="p-2">
                              <div className="bg-gray-100 p-3 rounded">
                                <h4 className="font-semibold text-gray-800 mb-2">
                                  Vulnerability Scan Result for {ip}:
                                </h4>
                                <pre className="bg-gray-900 text-green-300 p-4 rounded-md text-xs whitespace-pre-wrap overflow-auto">
                                  {vulnScanResult[ip]}
                                </pre>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* ❌ REMOVED: The old, separate scan result section is no longer needed. */}
          </div>
        )}

        {/* Device Metrics Modal/View */}
        {metricsDeviceIp && (
          <DeviceMetrics
            ip={metricsDeviceIp}
            monitoringData={monitoringData}
            metricsHistory={metricsHistory}
            onClose={() => setMetricsDeviceIp(null)}
          />
        )}
      </div>

      <TerminalModal
        isOpen={!!selectedDeviceIp}
        onClose={() => setSelectedDeviceIp(null)}
        ip={selectedDeviceIp}
      />
      <Chatbot />
    </div>
  );
};

const OverviewCard = ({ title, value }) => (
  <div className="bg-white shadow rounded-lg p-6 flex flex-col items-center justify-center">
    <p className="text-gray-500 uppercase tracking-wide text-sm font-semibold mb-2">
      {title}
    </p>
    <p className="text-3xl font-bold text-gray-900">{value}</p>
  </div>
);

export default AdminDashboard;
