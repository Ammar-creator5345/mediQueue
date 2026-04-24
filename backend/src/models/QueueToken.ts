import mongoose, { Schema, Document, Model } from "mongoose";

export type TokenStatus =
  | "waiting"
  | "called"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "skipped";

export type TokenSource = "appointment" | "walkin";

export interface IQueueToken extends Document {
  _id: mongoose.Types.ObjectId;
  tokenNumber: number;
  appointment?: mongoose.Types.ObjectId | null;
  patient?: mongoose.Types.ObjectId | null;
  patientName: string;
  patientPhone?: string | null;
  doctor: mongoose.Types.ObjectId;
  status: TokenStatus;
  source: TokenSource;
  notes?: string | null;
  dayKey: string; // YYYY-MM-DD-doctorId for sequential numbering
  createdAt: Date;
  updatedAt: Date;
}

const QueueTokenSchema = new Schema<IQueueToken>(
  {
    tokenNumber: { type: Number, required: true },
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment", default: null },
    patient: { type: Schema.Types.ObjectId, ref: "User", default: null },
    patientName: { type: String, required: true },
    patientPhone: { type: String, default: null },
    doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true, index: true },
    status: {
      type: String,
      enum: ["waiting", "called", "in_progress", "on_hold", "completed", "skipped"],
      default: "waiting",
      index: true,
    },
    source: { type: String, enum: ["appointment", "walkin"], required: true },
    notes: { type: String, default: null },
    dayKey: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

QueueTokenSchema.index({ dayKey: 1, tokenNumber: 1 }, { unique: true });

export const QueueToken: Model<IQueueToken> =
  mongoose.models["QueueToken"] ||
  mongoose.model<IQueueToken>("QueueToken", QueueTokenSchema);
