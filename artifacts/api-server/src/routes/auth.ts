import { Router, type IRouter } from "express";
import { signup, login, me, submitContact } from "../controllers/authController";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/signup", signup);
router.post("/auth/login", login);
router.get("/auth/me", requireAuth, me);
router.post("/contact", submitContact);

export default router;
