import { useState } from "react";
import axios from "axios";

const AddDeviceForm = () => {
  const [ip, setIp] = useState("");
  const [showSSHFields, setShowSSHFields] = useState(false);
  const [username, setUsername] = useState("");
  const [privateKey, setPrivateKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleIpSubmit = (e) => {
    e.preventDefault();
    setShowSSHFields(true);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!ip || !username || !privateKey) {
      setMessage("All fields are required.");
      return;
    }

    const formData = new FormData();
    formData.append("ip", ip);
    formData.append("username", username);
    formData.append("privateKey", privateKey);

    try {
      setLoading(true);
      setMessage("");
      const response = await axios.post("http://localhost:5000/api/devices/add", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setMessage(response.data.message || "Device added successfully!");
    } catch (err) {
      setMessage(err.response?.data?.message || "Error adding device");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded shadow bg-white max-w-md mx-auto my-6">
      <h2 className="text-xl font-bold mb-4">Add Device</h2>

      {!showSSHFields ? (
        <form onSubmit={handleIpSubmit}>
          <input
            type="text"
            placeholder="Enter Device IP"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            className="w-full p-2 border rounded mb-4"
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
            Next
          </button>
        </form>
      ) : (
        <form onSubmit={handleFinalSubmit}>
          <p className="mb-2 font-medium text-gray-700">IP: {ip}</p>
          <input
            type="text"
            placeholder="SSH Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 border rounded mb-4"
          />
          <input
            type="file"
            accept=".pem,.key"
            onChange={(e) => setPrivateKey(e.target.files[0])}
            className="w-full p-2 border rounded mb-4"
          />
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded" disabled={loading}>
            {loading ? "Adding..." : "Add Device"}
          </button>
        </form>
      )}

      {message && <p className="mt-4 text-sm text-red-600">{message}</p>}
    </div>
  );
};

export default AddDeviceForm;
