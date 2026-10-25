"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const common_1 = require("../../utils/common");
const httpError_1 = require("../../utils/httpError");
const products_schema_1 = require("./products.schema");
const service = __importStar(require("./products.service"));
const router = (0, express_1.Router)();
const admin = [auth_1.authenticate, (0, auth_1.requireRole)("admin")];
router.get("/", auth_1.optionalAuth, (0, validate_1.validate)(products_schema_1.listQuerySchema, "query"), (0, httpError_1.asyncHandler)(async (req, res) => {
    res.json(await service.list(req.query, req.user?.role === "admin"));
}));
router.get("/:id", auth_1.optionalAuth, (0, validate_1.validate)(common_1.uuidParam, "params"), (0, httpError_1.asyncHandler)(async (req, res) => {
    res.json(await service.getDetail(req.params.id, req.user?.id, req.user?.role === "admin"));
}));
router.post("/", ...admin, (0, validate_1.validate)(products_schema_1.productBodySchema), (0, httpError_1.asyncHandler)(async (req, res) => {
    res.status(201).json(await service.create(req.body));
}));
router.put("/:id", ...admin, (0, validate_1.validate)(common_1.uuidParam, "params"), (0, validate_1.validate)(products_schema_1.productUpdateSchema), (0, httpError_1.asyncHandler)(async (req, res) => {
    res.json(await service.update(req.params.id, req.body));
}));
router.delete("/:id", ...admin, (0, validate_1.validate)(common_1.uuidParam, "params"), (0, httpError_1.asyncHandler)(async (req, res) => {
    await service.remove(req.params.id);
    res.status(204).end();
}));
exports.default = router;
