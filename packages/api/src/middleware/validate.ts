import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '@pulse/core';

export const validate = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.parse) {
        req.body = schema.parse(req.body);
      }
      next();
    } catch (err: any) {
      next(new ValidationError(err.message || 'Invalid request payload'));
    }
  };
};
