const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`  SplitSmart Backend running on http://localhost:${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Health Check: http://localhost:${PORT}/api/health`);
      console.log(`====================================================`);
    });

    const shutdown = async (signal) => {
      console.log(`\n[Process] Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        console.log('[Process] HTTP server closed.');
        await disconnectDB();
        console.log('[Process] Database disconnected. Exiting process.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('[Startup Error] Failed to initialize server:', err.message);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;
