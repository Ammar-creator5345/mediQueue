import { Router, type IRouter } from "express";
import {
  listDoctors,
  getDoctor,
  listDoctorSlots,
  getMyDoctorProfile,
  updateMyDoctorProfile,
} from "../controllers/doctorController";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/doctors", requireAuth, listDoctors);
router.get("/doctors/me", requireAuth, requireRole("doctor"), getMyDoctorProfile);
router.put("/doctors/profile", requireAuth, requireRole("doctor"), updateMyDoctorProfile);
router.get("/doctors/:id", requireAuth, getDoctor);
router.get("/doctors/:id/slots", requireAuth, listDoctorSlots);

export default router;
