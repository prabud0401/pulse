import { Router } from 'express';
export const healthRouter: Router = Router();

healthRouter.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'pulse-api',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});
