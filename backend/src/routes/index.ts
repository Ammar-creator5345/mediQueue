import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import doctorsRouter from "./doctors";
import appointmentsRouter from "./appointments";
import queueRouter from "./queue";
import notificationsRouter from "./notifications";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(doctorsRouter);
router.use(appointmentsRouter);
router.use(queueRouter);
router.use(notificationsRouter);
router.use(reportsRouter);

export default router;
