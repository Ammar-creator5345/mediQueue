import { Router, type IRouter } from "express";
import {
  listAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  checkInAppointment,
} from "../controllers/appointmentController";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/appointments", requireAuth, listAppointments);
router.post("/appointments", requireAuth, requireRole("patient", "receptionist", "admin"), createAppointment);
router.get("/appointments/:id", requireAuth, getAppointment);
router.patch("/appointments/:id", requireAuth, updateAppointment);
router.delete("/appointments/:id", requireAuth, cancelAppointment);
router.post("/appointments/:id/check-in", requireAuth, checkInAppointment);

export default router;
