import type { Request, Response } from "express";
import PDFDocument from "pdfkit";
import { Appointment } from "../models/Appointment";
import { Doctor } from "../models/Doctor";
import { User } from "../models/User";
import { QueueToken } from "../models/QueueToken";

function fmtDate(d: Date): string {
  return d.toLocaleString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function downloadAppointmentReceipt(req: Request, res: Response): Promise<void> {
  const id = req.params["appointmentId"];
  if (!id) {
    res.status(400).json({ error: "appointmentId required" });
    return;
  }
  const appt = await Appointment.findById(id)
    .populate({ path: "patient" })
    .populate({ path: "doctor", populate: { path: "user" } });
  if (!appt) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }

  const patient: any = appt.patient && typeof appt.patient === "object" && "name" in appt.patient
    ? appt.patient
    : await User.findById(appt.patient);
  const doctor: any = appt.doctor && typeof appt.doctor === "object" && "specialty" in appt.doctor
    ? appt.doctor
    : await Doctor.findById(appt.doctor).populate("user");
  const doctorUser: any = doctor?.user && typeof doctor.user === "object" && "name" in doctor.user
    ? doctor.user
    : doctor?.user
    ? await User.findById(doctor.user)
    : null;

  const token = await QueueToken.findOne({ appointment: appt._id });

  const filename = `receipt-${appt.code}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.pipe(res);

  // Header
  doc.fillColor("#0ea5e9").fontSize(24).font("Helvetica-Bold").text("MediQueue", 50, 50);
  doc.fillColor("#64748b").fontSize(10).font("Helvetica").text("Appointment Receipt", 50, 78);
  doc.fillColor("#0f172a").fontSize(10).text(`Receipt #: ${appt.code}`, 400, 50, { align: "right" });
  doc.text(`Issued: ${fmtDate(new Date())}`, 400, 65, { align: "right" });

  doc.moveTo(50, 110).lineTo(545, 110).strokeColor("#e2e8f0").stroke();

  // Title
  doc.moveDown(2);
  doc.fillColor("#0f172a").fontSize(18).font("Helvetica-Bold").text("Appointment Details", 50, 130);

  // Body table
  let y = 165;
  const left = 50;
  const labelWidth = 160;
  const rows: Array<[string, string]> = [
    ["Patient Name", patient?.name ?? "—"],
    ["Patient Email", patient?.email ?? "—"],
    ["Doctor Name", doctorUser?.name ? `Dr. ${doctorUser.name}` : "—"],
    ["Specialty", doctor?.specialty ?? "—"],
    ["Appointment Date", fmtDate(appt.scheduledAt)],
    ["Token Number", token ? `#${token.tokenNumber}` : "Not yet checked-in"],
    ["Status", appt.status.replace(/_/g, " ").toUpperCase()],
    ["Reason", appt.reason || "—"],
  ];
  doc.fontSize(11).font("Helvetica");
  for (const [label, value] of rows) {
    doc.fillColor("#64748b").text(label, left, y, { width: labelWidth });
    doc.fillColor("#0f172a").font("Helvetica-Bold").text(String(value), left + labelWidth, y, { width: 335 });
    doc.font("Helvetica");
    y += 24;
  }

  // Fee box
  y += 20;
  doc.rect(left, y, 495, 70).fillAndStroke("#f0f9ff", "#bae6fd");
  doc.fillColor("#0c4a6e").fontSize(12).font("Helvetica-Bold").text("Consultation Fee", left + 20, y + 18);
  const feeStr = appt.fee > 0 ? `INR ${appt.fee.toFixed(2)}` : "Not set";
  doc.fillColor("#0c4a6e").fontSize(22).font("Helvetica-Bold").text(feeStr, left + 20, y + 36, {
    width: 455,
    align: "right",
  });

  // Footer
  doc.fillColor("#94a3b8").fontSize(9).font("Helvetica");
  doc.text(
    "This is a computer-generated receipt for record purposes. For any discrepancy, please contact the front desk.",
    50,
    760,
    { width: 495, align: "center" }
  );
  doc.text("MediQueue · Appointment & Queue Management", 50, 775, { width: 495, align: "center" });

  doc.end();
}
