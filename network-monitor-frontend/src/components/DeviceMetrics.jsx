import React, { useRef } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import autoTable from 'jspdf-autotable';

const DeviceMetrics = ({ ip, monitoringData, metricsHistory, onClose }) => {
  const history = metricsHistory[ip] || [];
  const usage = monitoringData[ip] || {};

  const diskUsed = Math.max(usage.diskUsagePercent || 0, 0.01);
  const diskFree = Math.max(100 - diskUsed, 0.01);

  // Refs for the container of each chart
  const cpuChartRef = useRef(null);
  const ramChartRef = useRef(null);
  const networkChartRef = useRef(null);
  const diskChartRef = useRef(null);

  // --- PDF EXPORT FUNCTION ---
  const handleExportMetricsPdf = async () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFontSize(18);
    doc.text(`Performance Metrics for ${usage.hostname || ip}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Report generated on: ${new Date().toLocaleString()}`, 14, 29);

    // Helper function to add a chart to the PDF
    const addChartToPdf = async (chartRef, title, x, y, width, height) => {
      if (chartRef.current) {
        const canvas = await html2canvas(chartRef.current, { backgroundColor: null });
        const imgData = canvas.toDataURL('image/png');
        doc.setFontSize(14);
        doc.text(title, x, y);
        doc.addImage(imgData, 'PNG', x, y + 5, width, height);
      }
    };

    // Add charts row by row
    await addChartToPdf(cpuChartRef, 'CPU Usage (%)', 14, 40, 80, 50);
    await addChartToPdf(ramChartRef, 'RAM Usage (%)', 110, 40, 80, 50);
    await addChartToPdf(networkChartRef, 'Network Usage (KB/s)', 14, 105, 80, 50);
    await addChartToPdf(diskChartRef, 'Disk Usage (%)', 110, 105, 80, 50);

    // Add the metrics history table after the charts
    autoTable(doc, {
      startY: 170,
      head: [['Time', 'CPU %', 'RAM %', 'Network (KB/s)']],
      body: history.map(h => [h.time, h.cpu, h.ram, h.network]),
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80] },
    });

    doc.save(`metrics_${ip}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-700">
                Performance Metrics for {usage.hostname || ip}
            </h3>
            <div>
                <button
                    onClick={handleExportMetricsPdf}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition mr-4"
                >
                    Export Metrics to PDF
                </button>
                <button
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    onClick={onClose}
                >
                    Close Metrics
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* CPU Usage */}
          <div ref={cpuChartRef}>
            <h4 className="text-lg font-medium mb-2">CPU Usage (%)</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* RAM Usage */}
          <div ref={ramChartRef}>
            <h4 className="text-lg font-medium mb-2">RAM Usage (%)</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="ram" stroke="#10B981" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Network Usage */}
          <div ref={networkChartRef}>
            <h4 className="text-lg font-medium mb-2">Network Usage (KB/s)</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="network" stroke="#F59E0B" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Disk Usage Pie Chart */}
        <div className="mt-12 flex justify-center">
            <div ref={diskChartRef} className="w-full max-w-md">
                 <h4 className="text-lg font-medium mb-4 text-center">Disk Usage (%)</h4>
                <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                    <Pie data={[{ name: "Used", value: diskUsed }, { name: "Free", value: diskFree }]} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                        <Cell key="used" fill="#EF4444" />
                        <Cell key="free" fill="#10B981" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceMetrics;
