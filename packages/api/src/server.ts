import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { workspacesRouter } from './routes/workspaces';
import { integrationsRouter } from './routes/integrations';
import { errorHandler } from './middleware/error-handler';

dotenv.config();

export function createApp(): express.Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ credentials: true, origin: process.env.CORS_ORIGIN || '*' }));
  app.use(morgan('dev'));
  app.use(compression());
  app.use(express.json());
  app.use(cookieParser());

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  });
  app.use('/api/', limiter);

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/workspaces', workspacesRouter);
  app.use('/api/integrations', integrationsRouter);


  app.use(errorHandler);

  return app;
}

const PORT = process.env.API_PORT || 4000;
if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
  });
}
