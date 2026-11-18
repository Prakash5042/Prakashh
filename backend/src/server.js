import { createApp } from './app.js';
import { config } from './config/index.js';
import { startCleanup } from './jobs/jobStore.js';

startCleanup();
const server = createApp().listen(config.port, () => console.log(`ClipFlow API listening on :${config.port}`));
server.requestTimeout = 10 * 60 * 1000;
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => process.exit(0)));
