import { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import io from "socket.io-client";

const TerminalModal = ({ ip, isOpen, onClose }) => {
  const terminalRef = useRef(null);
  const term = useRef(null);
  const socket = useRef(null);
  const fitAddon = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Initialize terminal
    term.current = new Terminal({
      theme: {
        background: "#1e1e1e",
        foreground: "#ffffff",
      },
      cursorBlink: true,
      rows: 30,
      cols: 100,
    });

    fitAddon.current = new FitAddon();
    term.current.loadAddon(fitAddon.current);

    // Attach terminal to DOM
    term.current.open(terminalRef.current);
    fitAddon.current.fit();

    // Connect to backend socket server
    socket.current = io("http://localhost:5000");

    // On connect, send the IP
    socket.current.emit("startSession", { ip });

    // Data from backend
    socket.current.on("data", (data) => {
      term.current.write(data);
    });

    // User input
    term.current.onData((data) => {
      socket.current.emit("input", data);
    });

    // Resize
    window.addEventListener("resize", () => {
      fitAddon.current?.fit();
    });

    return () => {
      // Cleanup on close
      socket.current.disconnect();
      term.current.dispose();
      fitAddon.current.dispose();
    };
  }, [ip, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center">
      <div className="relative bg-black rounded-lg overflow-hidden w-5/6 h-[80vh] shadow-lg">
        {/* Close Button */}
        <button
          className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded z-10"
          onClick={onClose}
        >
          Close
        </button>

        {/* Terminal Container */}
        <div
          ref={terminalRef}
          className="w-full h-full"
          style={{ overflow: "hidden" }}
        ></div>
      </div>
    </div>
  );
};

export default TerminalModal;
