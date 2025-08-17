const si = require('systeminformation');
const express = require('express');
const cors = require('cors'); // Add this line
const app = express();

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

app.listen(3000, () => console.log("Server running at http://localhost:3000"));