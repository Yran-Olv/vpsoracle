import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { db } from '../database';

export function logAuditAction(action: string, username: string, ip: string, details?: string) {
  try {
    db.prepare('INSERT INTO audit_logs (action, username, ip_address, details) VALUES (?, ?, ?, ?)').run(
      action,
      username,
      ip,
      details || null
    );
  } catch (err) {
    console.error('Failed to log audit action:', err);
  }
}

export function auditMiddleware(actionName: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const username = req.user?.username || 'anonymous';
    logAuditAction(actionName, username, ip, `${req.method} ${req.originalUrl}`);
    next();
  };
}
