import { Router, type Router as RouterType } from "express";
import { userController } from "./users.controller.js";
import { ValidationMiddleware } from "../../middleware/validation-middleware.js";
import { updateUserRequestSchema } from "./users.schema.js";

const router: RouterType = Router();

//TODO: Do we need AuthMiddleware here?
// Get current user
router.get("/me", userController.getCurrentUser);

// Update current user with validation (full resource replacement)
router.put("/me", ValidationMiddleware(updateUserRequestSchema), userController.updateCurrentUser);

export default router;
