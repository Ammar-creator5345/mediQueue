import { Router, type IRouter } from "express";
import {
  getReportSummary,
  getAppointmentsPerDay,
  getStatusDistribution,
  getQueueStatusReport,
  getDoctorUtilization,
} from "../controllers/reportController";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

const staff = requireRole("doctor", "receptionist", "admin");

router.get("/reports/summary", requireAuth, staff, getReportSummary);
router.get("/reports/appointments-per-day", requireAuth, staff, getAppointmentsPerDay);
router.get("/reports/status-distribution", requireAuth, staff, getStatusDistribution);
router.get("/reports/queue-status", requireAuth, staff, getQueueStatusReport);
router.get("/reports/doctor-utilization", requireAuth, staff, getDoctorUtilization);

export default router;
