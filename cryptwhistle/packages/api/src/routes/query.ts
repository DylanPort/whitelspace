/**
 * Query Routes - Handle AI computation requests
 */

import { Router, Request, Response } from 'express';
import { AIService } from '../services/AIService';
import { validateQuery } from '../middleware/validation';
import { logger } from '../utils/logger';

const router = Router();
const aiService = new AIService();

/**
 * POST /api/v1/query
 * Execute AI query
 */
router.post('/', validateQuery, async (req: Request, res: Response) => {
  const { task, input, options } = req.body;
  const startTime = Date.now();

  try {
    logger.info(`Processing query: ${task}`, {
      user: (req as any).user?.address,
      layer: options?.computeLayer || 'auto'
    });

    // Execute query
    const result = await aiService.execute(task, input, options || {});

    const duration = Date.now() - startTime;

    // Return result
    res.json({
      result: result.data,
      metadata: {
        computeLayer: options?.computeLayer || 'tee',
        duration,
        cost: result.cost,
        recipient: process.env.PAYMENT_RECIPIENT || '',
        proof: options?.requireProof ? result.proof : undefined,
        model: task,
        timestamp: Date.now()
      }
    });

    logger.info(`Query completed: ${task}`, {
      duration,
      cost: result.cost
    });

  } catch (error: any) {
    logger.error(`Query failed: ${task}`, { error: error.message });
    res.status(500).json({
      error: 'Query execution failed',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/query/status/:queryId
 * Get query status (for async queries)
 */
router.get('/status/:queryId', async (req: Request, res: Response) => {
  const { queryId } = req.params;

  try {
    const status = await aiService.getQueryStatus(queryId);
    res.json(status);
  } catch (error: any) {
    res.status(404).json({
      error: 'Query not found',
      message: error.message
    });
  }
});

export { router as queryRoutes };

