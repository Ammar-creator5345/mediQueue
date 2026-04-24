import mongoose, { Schema, Document, Model } from "mongoose";

export type AppointmentStatus =
  | "scheduled"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show";

export interface IAppointment extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  scheduledAt: Date;
  reason?: string | null;
  status: AppointmentStatus;
  fee: number;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    code: { type: String, required: true, unique: true, index: true },
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true, index: true },
    scheduledAt: { type: Date, required: true, index: true },
    reason: { type: String, default: null },
    status: {
      type: String,
      enum: ["scheduled", "checked_in", "completed", "cancelled", "no_show"],
      default: "scheduled",
      index: true,
    },
    fee: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

AppointmentSchema.index({ doctor: 1, scheduledAt: 1 }, { unique: true });

export const Appointment: Model<IAppointment> =
  mongoose.models["Appointment"] ||
  mongoose.model<IAppointment>("Appointment", AppointmentSchema);
