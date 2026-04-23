import { Router, type IRouter } from "express";
import {
  getReportSummary,
  getAppointmentsPerDay,
  getStatusDistribution,
  getQueueStatusReport,
  getDoctorUtilization,
} from "../controllers/reportController";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/reports/summary", requireAuth, getReportSummary);
router.get("/reports/appointments-per-day", requireAuth, getAppointmentsPerDay);
router.get("/reports/status-distribution", requireAuth, getStatusDistribution);
router.get("/reports/queue-status", requireAuth, getQueueStatusReport);
router.get("/reports/doctor-utilization", requireAuth, getDoctorUtilization);

export default router;
