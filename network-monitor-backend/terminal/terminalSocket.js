const pty = require('node-pty');
const os = require('os');

function setupTerminalSocket(io) {
  io.on('connection', (socket) => {
    console.log('🔌 Terminal socket connected');

    let shell, shellArgs;

    if (os.platform() === 'win32') {
      shell = 'wsl.exe';
      shellArgs = []; // launch default shell
    } else {
      shell = process.env.SHELL || 'bash';
      shellArgs = [];
    }

    const ptyProcess = pty.spawn(shell, shellArgs, {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: process.env.HOME || process.env.USERPROFILE,
      env: process.env,
    });

    // Send data to client
    ptyProcess.on('data', (data) => {
      socket.emit('data', data);
    });

    // Receive client input
    socket.on('input', (data) => {
      ptyProcess.write(data);
    });

    socket.on('disconnect', () => {
      console.log('❌ Terminal socket disconnected');
      ptyProcess.kill();
    });
  });
}

module.exports = { setupTerminalSocket };
