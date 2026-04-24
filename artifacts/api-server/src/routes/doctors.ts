import { Router, type IRouter } from "express";
import {
  listDoctors,
  getDoctor,
  listDoctorSlots,
  getMyDoctorProfile,
  updateDoctorFee,
} from "../controllers/doctorController";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/doctors", requireAuth, listDoctors);
router.get("/doctors/me", requireAuth, requireRole("doctor"), getMyDoctorProfile);
router.get("/doctors/:id", requireAuth, getDoctor);
router.get("/doctors/:id/slots", requireAuth, listDoctorSlots);
router.put("/doctors/:id/fee", requireAuth, requireRole("doctor", "admin"), updateDoctorFee);

export default router;
