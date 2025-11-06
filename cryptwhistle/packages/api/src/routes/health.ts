/**
 * Health Check Routes
 */

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV || 'development'
  };

  res.json(health);
});

/**
 * GET /health/ready
 * Readiness probe (for Kubernetes)
 */
router.get('/ready', async (req: Request, res: Response) => {
  // Check if all services are ready
  // In production, check database, Redis, etc.
  const ready = true;

  if (ready) {
    res.json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
});

/**
 * GET /health/live
 * Liveness probe (for Kubernetes)
 */
router.get('/live', async (req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

export { router as healthRoutes };

