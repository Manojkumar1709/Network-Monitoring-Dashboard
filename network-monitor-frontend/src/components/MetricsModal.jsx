import React from "react";
import { Dialog } from "@headlessui/react";

const MetricsModal = ({ isOpen, onClose, ip }) => {
  if (!isOpen) return null;

  // Sample data
  const data = {
    cpu: [20, 40, 35, 60, 80],
    ram: [30, 45, 55, 70, 65],
    disk: [60, 50, 40, 30, 20],
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <Dialog.Panel className="bg-white max-w-2xl w-full p-6 rounded-lg shadow-lg">
          <Dialog.Title className="text-lg font-bold mb-4">
            Metrics for {ip}
          </Dialog.Title>

          <div className="space-y-6">
            <MetricChart title="CPU Usage (%)" data={data.cpu} />
            <MetricChart title="RAM Usage (%)" data={data.ram} />
            <MetricChart title="Disk Usage (%)" data={data.disk} />
          </div>

          <div className="mt-6 text-right">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

const MetricChart = ({ title, data }) => (
  <div>
    <p className="font-medium text-gray-700 mb-1">{title}</p>
    <div className="flex space-x-2 h-20 items-end">
      {data.map((val, idx) => (
        <div
          key={idx}
          style={{ height: `${val}%` }}
          className="w-4 bg-blue-500 rounded"
          title={`${val}%`}
        />
      ))}
    </div>
  </div>
);

export default MetricsModal;
