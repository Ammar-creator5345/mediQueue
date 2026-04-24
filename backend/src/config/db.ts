import mongoose from "mongoose";
import { logger } from "../lib/logger";

let connecting: Promise<typeof mongoose> | null = null;

export async function connectDB(): Promise<void> {
  const uri =
    process.env["MONGODB_URI"] ||
    "mongodb+srv://medicalProject:H8urNc2yVpsbPbuM@medicalcluster.jbnvolp.mongodb.net/?appName=medicalCluster";
  if (!uri) throw new Error("MONGODB_URI is required");

  if (mongoose.connection.readyState === 1) return;
  if (!connecting) {
    mongoose.set("strictQuery", true);
    connecting = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
    });
  }
  await connecting;
  logger.info({ db: mongoose.connection.name }, "MongoDB connected");
}
