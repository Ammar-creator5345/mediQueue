import { Router, type IRouter } from "express";
import { listDoctors, getDoctor, listDoctorSlots } from "../controllers/doctorController";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/doctors", requireAuth, listDoctors);
router.get("/doctors/:id", requireAuth, getDoctor);
router.get("/doctors/:id/slots", requireAuth, listDoctorSlots);

export default router;
