const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const si = require('systeminformation');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow connections from any origin
    }
});

app.use(cors()); // Enable CORS for all routes

app.get('/stats', async (req, res) => {
    try {
        const cpu = await si.currentLoad();
        const mem = await si.mem();
        const gpu = await si.graphics();
        const processes = await si.processes();
        const disks = await si.fsSize();
        const network = await si.networkStats();
        const osInfo = await si.osInfo();
        const uptime = await si.time();

        res.json({
            cpu: cpu,
            memory: mem,
            gpu: gpu,
            processes: processes,
            disks: disks,
            network: network,
            os: osInfo,
            uptime: uptime
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
 // --- ADVANCED CHATBOT LOGIC ---
io.on('connection', (socket) => {
    console.log('🤖 A user connected to the chatbot');

    socket.on('sendMessage', (msg, stats) => {
        console.log('Message received:', msg);
        // Generate a response based on the full system stats
        const response = generateBotResponse(msg, stats);

        // Simulate AI thinking time before responding
        setTimeout(() => {
            socket.emit('botResponse', response);
            console.log('Response sent:', response);
        }, 1000);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

/**
 * Generates a chatbot response based on the user's message and system data.
 * @param {string} msg The user's message.
 * @param {object} stats The full object of system stats from systeminformation.
 * @returns {string} The generated response.
 */
function generateBotResponse(msg, stats) {
    try {
        const query = (msg || '').toLowerCase();

        // Validate stats object
        if (!stats || typeof stats !== 'object' || Object.keys(stats).length === 0) {
            return "I'm still waiting for the first batch of system data. Please try again in a moment.";
        }

        if (query.includes('cpu')) {
            const currentLoad = stats.cpu && typeof stats.cpu.currentLoad === 'number' ? stats.cpu.currentLoad : null;
            const coreCount = stats.cpu && Array.isArray(stats.cpu.cpus) ? stats.cpu.cpus.length : undefined;
            if (currentLoad !== null) {
                const coresText = coreCount ? `${coreCount} cores` : 'multiple cores';
                return `✅ CPU load is currently at ${currentLoad.toFixed(1)}%. The system is running on ${coresText}.`;
            }
            return "I couldn't read the current CPU load.";
        }
        if (query.includes('memory') || query.includes('ram')) {
            const memUsed = stats.memory && typeof stats.memory.used === 'number' ? stats.memory.used : null;
            const memTotal = stats.memory && typeof stats.memory.total === 'number' ? stats.memory.total : null;
            if (memUsed !== null && memTotal !== null && memTotal > 0) {
                const memUsedGB = (memUsed / 1024 / 1024 / 1024).toFixed(2);
                const memTotalGB = (memTotal / 1024 / 1024 / 1024).toFixed(2);
                return `✅ Memory usage is at ${memUsedGB} GB out of ${memTotalGB} GB total.`;
            }
            return "I couldn't read memory usage data.";
        }
        if (query.includes('disk') || query.includes('storage')) {
            if (stats.disks && Array.isArray(stats.disks) && stats.disks.length > 0) {
                const disk = stats.disks[0];
                if (disk && typeof disk.used === 'number' && typeof disk.size === 'number') {
                    const diskUsedGB = (disk.used / 1024 / 1024 / 1024).toFixed(2);
                    const diskTotalGB = (disk.size / 1024 / 1024 / 1024).toFixed(2);
                    const diskUse = typeof disk.use === 'number' ? ` (${disk.use.toFixed(1)}%)` : '';
                    return `✅ The main disk has used ${diskUsedGB} GB of ${diskTotalGB} GB${diskUse}.`;
                }
            }
            return "I couldn't retrieve any disk storage information from the system.";
        }
        if (query.includes('gpu') || query.includes('graphics')) {
            if (stats.gpu && Array.isArray(stats.gpu.controllers) && stats.gpu.controllers.length > 0) {
                const gpu = stats.gpu.controllers[0];
                const vendor = gpu && gpu.vendor ? gpu.vendor : 'Unknown vendor';
                const model = gpu && gpu.model ? gpu.model : 'Unknown model';
                return `✅ The graphics card is a ${vendor} ${model}.`;
            }
            return "I couldn't retrieve specific GPU details from the system.";
        }
        if (query.includes('network')) {
            if (stats.network && Array.isArray(stats.network) && stats.network.length > 0) {
                const net = stats.network[0];
                const downSpeed = typeof net.rx_sec === 'number' ? (net.rx_sec / 1024).toFixed(1) : '0.0';
                const upSpeed = typeof net.tx_sec === 'number' ? (net.tx_sec / 1024).toFixed(1) : '0.0';
                return `✅ Current network speed is ${downSpeed} KB/s download and ${upSpeed} KB/s upload.`;
            }
            return "I couldn't retrieve any network activity information.";
        }
        if (query.includes('os') || query.includes('system')) {
            const distro = stats.os && stats.os.distro ? stats.os.distro : 'Unknown OS';
            const platform = stats.os && stats.os.platform ? stats.os.platform : 'unknown platform';
            const uptimeSeconds = stats.uptime && typeof stats.uptime.uptime === 'number' ? stats.uptime.uptime : null;
            const uptimeHours = uptimeSeconds !== null ? (uptimeSeconds / 3600).toFixed(2) : 'unknown';
            return `✅ The OS is ${distro} on the ${platform} platform. The system has been running for ${uptimeHours} hours.`;
        }
        if (query.includes('process')) {
            if (stats.processes && stats.processes.list && Array.isArray(stats.processes.list) && stats.processes.list.length > 0) {
                const topProcess = stats.processes.list[0];
                const topName = topProcess && topProcess.name ? topProcess.name : 'unknown process';
                const topCpu = topProcess && typeof topProcess.cpu === 'number' ? topProcess.cpu.toFixed(1) : '0.0';
                const total = stats.processes.all || stats.processes.list.length;
                return `✅ There are ${total} processes running. The most active is "${topName}" using ${topCpu}% of the CPU.`;
            }
            return "I was unable to retrieve details about running processes.";
        }

        return "I can answer questions about CPU, memory, disk, GPU, network, OS, and processes. How can I assist you?";
    } catch (error) {
        console.error('Error generating bot response:', error);
        return "I ran into an issue interpreting the data. Please try again.";
    }
}
server.listen(3000, () => console.log("Server running at http://localhost:3000"));