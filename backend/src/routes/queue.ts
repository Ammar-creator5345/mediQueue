import { Router, type IRouter } from "express";
import { listQueue, addWalkIn, updateQueueToken } from "../controllers/queueController";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/queue", requireAuth, listQueue);
router.post("/queue", requireAuth, requireRole("receptionist", "admin"), addWalkIn);
router.patch("/queue/:id", requireAuth, requireRole("doctor", "receptionist", "admin"), updateQueueToken);

export default router;
