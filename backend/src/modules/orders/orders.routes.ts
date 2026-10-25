import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { uuidParam } from "../../utils/common";
import { asyncHandler } from "../../utils/httpError";
import { checkoutSchema, OrderListQuery, orderListQuerySchema } from "./orders.schema";
import * as service from "./orders.service";

const router = Router();
router.use(authenticate);

router.post(
  "/",
  validate(checkoutSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.checkout(req.user!.id, req.body));
  })
);

router.get(
  "/",
  validate(orderListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as OrderListQuery;
    res.json(await service.listMine(req.user!.id, q.page, q.limit));
  })
);

router.get(
  "/:id",
  validate(uuidParam, "params"),
  asyncHandler(async (req, res) => {
    res.json(await service.getById(req.params.id, req.user!));
  })
);

router.post(
  "/:id/cancel",
  validate(uuidParam, "params"),
  asyncHandler(async (req, res) => {
    res.json(await service.changeStatus(req.params.id, "cancelled", req.user!));
  })
);

export default router;
