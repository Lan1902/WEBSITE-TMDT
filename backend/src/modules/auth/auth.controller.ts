import { Request, Response } from "express";
import { asyncHandler } from "../../utils/httpError";
import * as service from "./auth.service";

export const register = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.register(req.body));
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.login(req.body));
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getProfile(req.user!.id));
});
