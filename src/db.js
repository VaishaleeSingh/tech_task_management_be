const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('❌ CRITICAL: MONGODB_URI is missing!');
    process.exit(1);
  }

  console.log('📡 Attempting to connect to MongoDB Atlas...');
  
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log('❌ MONGODB CONNECTION ERROR:');
    console.log(`- Error Message: ${error.message}`);
    console.log(`- Error Name: ${error.name}`);
    
    // Give Render time to flush the logs before we kill the process
    await new Promise(resolve => setTimeout(resolve, 2000));
    process.exit(1);
  }
};

module.exports = connectDB;
