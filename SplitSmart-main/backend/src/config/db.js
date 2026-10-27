const mongoose = require('mongoose');

let mongodInstance = null;

async function connectDB() {
  const isTest = process.env.NODE_ENV === 'test';
  const forceInMemory = process.env.USE_IN_MEMORY_DB === 'true';

  let uri = process.env.MONGODB_URI;

  if (isTest || forceInMemory) {
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create();
      uri = mongodInstance.getUri();
      console.log(`[Database] Using in-memory MongoDB instance for ${isTest ? 'testing' : 'development'}`);
    } catch (memErr) {
      console.warn('[Database] Could not start MongoMemoryServer, falling back to configured URI:', memErr.message);
    }
  }

  if (!uri) {
    console.error(
      '\n============================================================\n' +
      '[ERROR] MongoDB Configuration Missing!\n' +
      'Please configure MONGODB_URI in backend/.env with your MongoDB Atlas connection string:\n' +
      'Example: MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/splitsmart?retryWrites=true&w=majority\n' +
      '============================================================\n'
    );
    throw new Error('MONGODB_URI is required to start SplitSmart.');
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[Database] Connected successfully to MongoDB: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production' && !mongodInstance) {
      console.warn(
        `\n[Database Warning] Unable to connect to local MongoDB at: ${uri}\n` +
        `Details: ${err.message}\n` +
        `[Database] Automatically starting an in-memory MongoDB instance for local development/demo...\n` +
        `For persistent data, set your MongoDB Atlas connection string in backend/.env: MONGODB_URI=mongodb+srv://...\n`
      );
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongodInstance = await MongoMemoryServer.create();
        uri = mongodInstance.getUri();
        const conn = await mongoose.connect(uri);
        console.log(`[Database] Connected to in-memory MongoDB: ${conn.connection.host}/${conn.connection.name}`);
        return conn;
      } catch (memFallbackErr) {
        console.error('[Database Error] In-memory fallback also failed:', memFallbackErr.message);
      }
    }

    console.error(
      '\n============================================================\n' +
      `[ERROR] Failed to connect to MongoDB at: ${uri}\n` +
      `Details: ${err.message}\n` +
      'Check that your database server is running or verify your MongoDB Atlas credentials and IP whitelist.\n' +
      '============================================================\n'
    );
    throw err;
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (mongodInstance) {
    await mongodInstance.stop();
    mongodInstance = null;
  }
}

module.exports = {
  connectDB,
  disconnectDB
};
