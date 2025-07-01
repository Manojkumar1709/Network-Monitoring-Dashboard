// src/pages/Landing.jsx
import { Link } from "react-router-dom";
import { FaNetworkWired, FaChartBar, FaBell, FaLock } from "react-icons/fa";

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center text-center py-20 px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-blue-900 mb-4">Network Monitoring Dashboard</h1>
        <p className="text-lg md:text-xl text-blue-700 mb-6 max-w-2xl">
          Monitor, detect, and respond to device activity in real time. Track performance, identify vulnerabilities, and get alerts instantly.
        </p>
        <Link
          to="/signup"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-lg transition"
        >
          Get Started
        </Link>
      </div>

      {/* Features Section */}
      <div className="bg-white py-16 px-6 md:px-20">
        <h2 className="text-3xl font-bold text-center text-blue-900 mb-10">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          <FeatureCard icon={<FaNetworkWired />} title="Device Discovery" description="Auto-scan networks to find and list all connected devices." />
          <FeatureCard icon={<FaChartBar />} title="Real-Time Monitoring" description="Live updates on device status, CPU, memory, and bandwidth." />
          <FeatureCard icon={<FaBell />} title="Smart Alerts" description="Email/SMS alerts for offline devices or high resource usage." />
          <FeatureCard icon={<FaLock />} title="Vulnerability Scan" description="Scan for open ports and possible device threats." />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-blue-600 text-white text-center py-6 mt-auto">
        <p className="text-sm">&copy; 2025 Network Dashboard. All rights reserved.</p>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 shadow hover:shadow-xl transition">
    <div className="text-4xl text-blue-600 mb-4">{icon}</div>
    <h3 className="text-xl font-semibold text-blue-900 mb-2">{title}</h3>
    <p className="text-blue-700 text-sm">{description}</p>
  </div>
);

export default Landing;
