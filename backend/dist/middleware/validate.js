"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
// Kiểm tra dữ liệu đầu vào; thay req[part] bằng dữ liệu đã được làm sạch
const validate = (schema, part = "body") => (req, _res, next) => {
    const result = schema.safeParse(req[part]);
    if (!result.success)
        return next(result.error);
    req[part] = result.data;
    next();
};
exports.validate = validate;
