const config = module.exports = {};

config.adapter = process.env.WORKER_ALGORITHM_PROTOCOL || 'socket';

config.socket = {
    port: process.env.WORKER_SOCKET_PORT || 9876,
    host: process.env.WORKER_SOCKET_HOST || 'localhost',
    protocol: process.env.WORKER_SOCKET_PROTOCOL || 'ws',
    url: process.env.WORKER_SOCKET_URL || null
};

config.algorithm = {
    path: '../algorithm_unique_folder',
    entryPoint: process.env.ALGORITHM_ENTRY_POINT || ''
};