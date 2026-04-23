import mongoose, { Schema, Document, Model } from "mongoose";

export type UserRole = "patient" | "doctor" | "receptionist" | "admin";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["patient", "doctor", "receptionist", "admin"],
      required: true,
    },
    phone: { type: String, default: null },
  },
  { timestamps: true }
);

export const User: Model<IUser> =
  mongoose.models["User"] || mongoose.model<IUser>("User", UserSchema);

export function publicUser(u: IUser) {
  return {
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}
