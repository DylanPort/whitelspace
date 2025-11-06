/**
 * Authentication Middleware
 * Validates Solana wallet signatures
 */

import { Request, Response, NextFunction } from 'express';
import { PublicKey } from '@solana/web3.js';
import { logger } from '../utils/logger';

/**
 * Authenticate requests via Solana wallet signature
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const walletAddress = req.headers['x-wallet-address'] as string;

    // For development, allow requests without auth
    if (process.env.NODE_ENV === 'development' && !authHeader) {
      logger.debug('Development mode: skipping authentication');
      (req as any).user = { address: 'dev-user' };
      return next();
    }

    if (!authHeader) {
      res.status(401).json({ error: 'Missing Authorization header' });
      return;
    }

    if (!walletAddress) {
      res.status(401).json({ error: 'Missing X-Wallet-Address header' });
      return;
    }

    // Verify signature
    const token = authHeader.replace('Bearer ', '');
    const isValid = await verifySignature(token, walletAddress);

    if (!isValid) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // Attach user to request
    (req as any).user = {
      address: walletAddress,
      signature: token
    };

    next();
  } catch (error: any) {
    logger.error('Authentication failed', { error: error.message });
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Verify Solana wallet signature
 */
async function verifySignature(
  signature: string,
  address: string
): Promise<boolean> {
  try {
    // In production, implement actual signature verification
    // using nacl.sign.detached.verify
    
    // Validate address format
    const publicKey = new PublicKey(address);
    
    // For MVP, accept any non-empty signature
    return signature.length > 0;
  } catch (error) {
    return false;
  }
}

