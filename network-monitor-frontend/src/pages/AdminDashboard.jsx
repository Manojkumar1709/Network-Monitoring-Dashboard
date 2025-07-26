import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import TerminalModal from "../components/TerminalModal";

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

  // Redirect if user not logged or not admin
  useEffect(() => {
    if (!user || !token) {
      console.log("User or token missing, redirecting to login");
      navigate("/login");
    } else if (user.role !== "Admin") {
      console.log("User role is not Admin, redirecting to unauthorized");
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
      } catch (err) {
        console.error("Error fetching monitoring data:", err);
      }
    };

    fetchMonitoringData();
  }, [devices, token]);

  const handleAddDevice = async (e) => {
    e.preventDefault();
    if (!newDeviceIp.trim()) return;

    setLoadingAdd(true);
    setErrorAdd(null);

    try {
      await axios.post(
        "http://localhost:5000/api/devices/add",
        { ip: newDeviceIp },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchDevices();
      setNewDeviceIp("");
    } catch (err) {
      setErrorAdd(err.response?.data?.message || "Failed to add device");
      console.error("Add device error:", err);
    } finally {
      setLoadingAdd(false);
    }
  };

  if (!user || !token) {
    // Show simple loading or blank while redirecting
    return <p className="p-8 text-center">Loading...</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex justify-between items-center px-8 py-4 bg-white shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-blue-800">Network Dashboard</h1>
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

        <form onSubmit={handleAddDevice} className="mb-6 flex items-center space-x-4">
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

        {loadingDevices ? (
          <p>Loading devices...</p>
        ) : (
          <div className="bg-white shadow rounded-lg p-6 overflow-auto max-h-[400px]">
            <h3 className="text-xl font-semibold mb-4 text-gray-700">Discovered Devices</h3>
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-600">
                  <th className="border px-4 py-2 text-left">IP Address</th>
                  <th className="border px-4 py-2 text-left">MAC Address</th>
                  <th className="border px-4 py-2 text-left">Hostname</th>
                  <th className="border px-4 py-2 text-left">Status</th>
                  <th className="border px-4 py-2 text-left">CPU %</th>
                  <th className="border px-4 py-2 text-left">RAM %</th>
                  <th className="border px-4 py-2 text-left">Disk %</th>
                  <th className="border px-4 py-2 text-left">Network Bytes</th>
                  <th className="border px-4 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {devices.length === 0 && (
                  <tr>
                    <td colSpan="9" className="text-center py-4 text-gray-500">
                      No devices found.
                    </td>
                  </tr>
                )}
                {devices.map(({ _id, ip, mac, hostname, status }) => {
                  const monitor = monitoringData[ip] || {};
                  return (
                    <tr key={_id} className={status === "Offline" ? "bg-red-50" : "bg-white"}>
                      <td className="border px-4 py-2">{ip || "-"}</td>
                      <td className="border px-4 py-2">{mac || "-"}</td>
                      <td className="border px-4 py-2">{hostname || "-"}</td>
                      <td
                        className={`border px-4 py-2 font-semibold ${
                          status === "Online" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {status || "-"}
                      </td>
                      <td className="border px-4 py-2">{monitor.cpuUsagePercent ?? "-"}</td>
                      <td className="border px-4 py-2">{monitor.ramUsagePercent ?? "-"}</td>
                      <td className="border px-4 py-2">{monitor.diskUsagePercent ?? "-"}</td>
                      <td className="border px-4 py-2">{monitor.networkUsageBytes ?? "-"}</td>
                      <td className="border px-4 py-2">
                        {status === "Online" && (
                          <button
                            className="bg-gray-800 text-white px-3 py-1 rounded text-xs hover:bg-gray-900"
                            onClick={() => setSelectedDeviceIp(ip)}
                          >
                            Launch Terminal
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TerminalModal
        isOpen={!!selectedDeviceIp}
        onClose={() => setSelectedDeviceIp(null)}
        ip={selectedDeviceIp}
      />
    </div>
  );
};

const OverviewCard = ({ title, value }) => (
  <div className="bg-white shadow rounded-lg p-6 flex flex-col items-center justify-center">
    <p className="text-gray-500 uppercase tracking-wide text-sm font-semibold mb-2">{title}</p>
    <p className="text-3xl font-bold text-gray-900">{value}</p>
  </div>
);

export default AdminDashboard;
