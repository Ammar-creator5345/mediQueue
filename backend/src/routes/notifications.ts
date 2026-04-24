import { Router, type IRouter } from "express";
import { listNotifications, markNotificationRead } from "../controllers/notificationController";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/notifications", requireAuth, listNotifications);
router.post("/notifications/:id/read", requireAuth, markNotificationRead);

export default router;
