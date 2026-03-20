import mongoose from 'mongoose';

// This function connects our server to MongoDB
const connectDB = async (): Promise<void> => {
  try {
    // process.env.MONGODB_URI reads the value from your .env file
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in .env file');
    }

    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    // Exit the program if DB fails — no point running without a database
    process.exit(1);
  }
};

export default connectDB;