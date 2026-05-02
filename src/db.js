const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('❌ MONGODB_URI is missing in environment variables!');
      process.exit(1);
    }
    console.log('📡 Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Error Details:');
    console.error(`- Message: ${error.message}`);
    console.error(`- Code: ${error.code}`);
    process.exit(1);
  }
};

module.exports = connectDB;
