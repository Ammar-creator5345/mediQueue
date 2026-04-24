import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDoctor extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  specialty: string;
  bio?: string | null;
  consultationMinutes: number;
  consultationFee: number;
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  createdAt: Date;
  updatedAt: Date;
}

const DoctorSchema = new Schema<IDoctor>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    specialty: { type: String, required: true, trim: true },
    bio: { type: String, default: null },
    consultationMinutes: { type: Number, default: 20, min: 5, max: 240 },
    consultationFee: { type: Number, default: 0, min: 0 },
    startTime: { type: String, default: "09:00" },
    endTime: { type: String, default: "17:00" },
  },
  { timestamps: true }
);

export const Doctor: Model<IDoctor> =
  mongoose.models["Doctor"] || mongoose.model<IDoctor>("Doctor", DoctorSchema);
