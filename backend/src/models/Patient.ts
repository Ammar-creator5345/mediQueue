import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPatient extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  dateOfBirth?: Date | null;
  gender?: string | null;
  bloodGroup?: string | null;
  address?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema = new Schema<IPatient>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, default: null },
    bloodGroup: { type: String, default: null },
    address: { type: String, default: null },
  },
  { timestamps: true }
);

export const Patient: Model<IPatient> =
  mongoose.models["Patient"] || mongoose.model<IPatient>("Patient", PatientSchema);
