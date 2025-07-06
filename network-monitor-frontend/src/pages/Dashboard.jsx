import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { logout, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [devices] = useState([
    { id: 1, ip: "192.168.1.10", mac: "AA:BB:CC:DD:EE:FF", hostname: "Device-A", status: "Online" },
    { id: 2, ip: "192.168.1.12", mac: "11:22:33:44:55:66", hostname: "Device-B", status: "Offline" },
    { id: 3, ip: "192.168.1.15", mac: "77:88:99:AA:BB:CC", hostname: "Device-C", status: "Online" },
  ]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="flex justify-between items-center px-8 py-4 bg-white shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-blue-800">Network Dashboard</h1>
          {user && <p className="text-sm text-gray-600">Welcome, {user.username}</p>}
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="p-8">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6">Dashboard Overview</h2>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <OverviewCard title="Total Devices" value={devices.length} />
          <OverviewCard title="Online Devices" value={devices.filter(d => d.status === "Online").length} />
          <OverviewCard title="Offline Devices" value={devices.filter(d => d.status === "Offline").length} />
        </div>

        {/* Devices Table */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">Discovered Devices</h3>
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-600">
                <th className="border px-4 py-2 text-left">IP Address</th>
                <th className="border px-4 py-2 text-left">MAC Address</th>
                <th className="border px-4 py-2 text-left">Hostname</th>
                <th className="border px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(({ id, ip, mac, hostname, status }) => (
                <tr key={id} className={status === "Offline" ? "bg-red-50" : "bg-white"}>
                  <td className="border px-4 py-2">{ip}</td>
                  <td className="border px-4 py-2">{mac}</td>
                  <td className="border px-4 py-2">{hostname}</td>
                  <td
                    className={`border px-4 py-2 font-semibold ${
                      status === "Online" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const OverviewCard = ({ title, value }) => (
  <div className="bg-white shadow rounded-lg p-6 flex flex-col items-center justify-center">
    <p className="text-gray-500 uppercase tracking-wide text-sm font-semibold mb-2">{title}</p>
    <p className="text-3xl font-bold text-gray-900">{value}</p>
  </div>
);

export default Dashboard;
