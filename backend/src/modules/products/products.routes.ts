import { Router } from "express";
import { authenticate, optionalAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { uuidParam } from "../../utils/common";
import { asyncHandler } from "../../utils/httpError";
import { ListQuery, listQuerySchema, productBodySchema, productUpdateSchema } from "./products.schema";
import * as service from "./products.service";

const router = Router();
const admin = [authenticate, requireRole("admin")];

router.get(
  "/",
  optionalAuth,
  validate(listQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    res.json(await service.list(req.query as unknown as ListQuery, req.user?.role === "admin"));
  })
);

router.get(
  "/:id",
  optionalAuth,
  validate(uuidParam, "params"),
  asyncHandler(async (req, res) => {
    res.json(await service.getDetail(req.params.id, req.user?.id, req.user?.role === "admin"));
  })
);

router.post(
  "/",
  ...admin,
  validate(productBodySchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.create(req.body));
  })
);

router.put(
  "/:id",
  ...admin,
  validate(uuidParam, "params"),
  validate(productUpdateSchema),
  asyncHandler(async (req, res) => {
    res.json(await service.update(req.params.id, req.body));
  })
);

router.delete(
  "/:id",
  ...admin,
  validate(uuidParam, "params"),
  asyncHandler(async (req, res) => {
    await service.remove(req.params.id);
    res.status(204).end();
  })
);

export default router;
