import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// This component receives the device data as a prop
const ExportControls = ({ deviceData, disabled }) => {

  // --- PDF EXPORT FUNCTION ---
  const exportToPdf = () => {
    if (!deviceData || !deviceData.length) {
      alert('No data to export!');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });

    const tableColumns = [
      { header: 'IP', dataKey: 'ip' },
      { header: 'Hostname', dataKey: 'hostname' },
      { header: 'Status', dataKey: 'status' },
      { header: 'CPU %', dataKey: 'cpu' },
      { header: 'RAM %', dataKey: 'ram' },
      { header: 'Disk %', dataKey: 'disk' },
      { header: 'Network (KB/s)', dataKey: 'network' },
      { header: 'Vulnerabilities', dataKey: 'vulnerabilities' },
    ];

    // Map your device data to a simpler format for the table
    const tableRows = deviceData.map(device => {
      const lines = [];
      
      if (device.ports && Array.isArray(device.ports) && device.ports.length > 0) {
        lines.push('Open Ports:');
        lines.push(device.ports.join('\n'));
      }

      if (device.vulnerabilities && device.vulnerabilities !== 'Not Scanned') {
        if (lines.length > 0) {
          lines.push(''); // Add a spacer line
        }
        lines.push('Vulnerability Scan:');

        // --- FIX: Manually break very long lines without spaces ---
        const sanitizedVulns = device.vulnerabilities
          .split('\n')
          .map(line => {
            const trimmedLine = line.trim();
            // If a line is very long and has no spaces, break it manually.
            // 100 characters is a safe length for landscape mode.
            if (trimmedLine.length > 100 && !trimmedLine.includes(' ')) {
              let brokenLine = '';
              for (let i = 0; i < trimmedLine.length; i += 100) {
                brokenLine += trimmedLine.substring(i, i + 100) + '\n';
              }
              return brokenLine.trim();
            }
            return trimmedLine;
          })
          .filter(line => line)
          .join('\n');
        lines.push(sanitizedVulns);
      }

      if (lines.length === 0) {
        lines.push('Not Scanned');
      }
      
      return {
        ip: device.internalIp || 'N/A',
        hostname: device.hostname || 'N/A',
        status: device.status || 'Offline',
        cpu: device.cpuUsagePercent || 'N/A',
        ram: device.ramUsagePercent || 'N/A',
        disk: device.diskUsagePercent || 'N/A',
        network: device.networkUsageKBps || 'N/A',
        vulnerabilities: lines.join('\n'),
      };
    });

    doc.setFontSize(18);
    doc.text('Device Logs Report', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Report generated on: ${new Date().toLocaleString()}`, 14, 29);

    autoTable(doc, {
      columns: tableColumns,
      body: tableRows,
      startY: 35,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: {
        ip: { cellWidth: 30 },
        hostname: { cellWidth: 25 },
        status: { cellWidth: 18 },
        cpu: { cellWidth: 15 },
        ram: { cellWidth: 15 },
        disk: { cellWidth: 15 },
        network: { cellWidth: 22 },
        vulnerabilities: { cellWidth: 'auto' },
      }
    });

    doc.save('device_logs.pdf');
  };

  // --- CSV EXPORT FUNCTION ---
  const exportToCsv = () => {
    if (!deviceData || !deviceData.length) {
      alert('No data to export!');
      return;
    }

    const headers = ['IP', 'Hostname', 'Status', 'CPU %', 'RAM %', 'Disk %', 'Network (KB/s)', 'Vulnerabilities'];
    
    const escapeCell = (cell) => {
        const str = String(cell || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const csvContent = [
      headers.join(','),
      ...deviceData.map(device => {
        const lines = [];
        if (device.ports && Array.isArray(device.ports) && device.ports.length > 0) {
          lines.push('Open Ports:');
          lines.push(device.ports.join('\n'));
        }
        if (device.vulnerabilities && device.vulnerabilities !== 'Not Scanned') {
          if (lines.length > 0) lines.push('');
          lines.push('Vulnerability Scan:');
          const sanitizedVulns = device.vulnerabilities.split('\n').map(line => line.trim()).filter(line => line).join('\n');
          lines.push(sanitizedVulns);
        }
        if (lines.length === 0) lines.push('Not Scanned');

        return [
          escapeCell(device.internalIp),
          escapeCell(device.hostname),
          escapeCell(device.status),
          escapeCell(device.cpuUsagePercent),
          escapeCell(device.ramUsagePercent),
          escapeCell(device.diskUsagePercent),
          escapeCell(device.networkUsageKBps),
          escapeCell(lines.join('\n')),
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'device_logs.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="flex items-center space-x-4">
      <button
        onClick={exportToPdf}
        disabled={disabled}
        className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
      >
        Export to PDF
      </button>
      <button
        onClick={exportToCsv}
        disabled={disabled}
        className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75"
      >
        Export to CSV
      </button>
    </div>
  );
};

export default ExportControls;
