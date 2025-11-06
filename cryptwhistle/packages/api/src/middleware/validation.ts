/**
 * Request Validation Middleware
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

const querySchema = Joi.object({
  task: Joi.string().required(),
  input: Joi.object().required(),
  options: Joi.object({
    computeLayer: Joi.string().valid('tee', 'fhe', 'auto'),
    requireProof: Joi.boolean(),
    maxLatency: Joi.number(),
    maxCost: Joi.number()
  })
});

export function validateQuery(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { error } = querySchema.validate(req.body);

  if (error) {
    res.status(400).json({
      error: 'Validation failed',
      message: error.details[0].message
    });
    return;
  }

  next();
}

