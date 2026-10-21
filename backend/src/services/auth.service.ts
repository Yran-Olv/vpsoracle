import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../database';
import { config } from '../config';

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export class AuthService {
  static async login(username: string, passwordPlain: string): Promise<{ token: string; user: { id: number; username: string; role: string } } | null> {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined;
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(passwordPlain, user.password_hash);
    if (!isValid) {
      return null;
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    };
  }

  static async changePassword(userId: number, currentPasswordPlain: string, newPasswordPlain: string): Promise<boolean> {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow | undefined;
    if (!user) return false;

    const isValid = await bcrypt.compare(currentPasswordPlain, user.password_hash);
    if (!isValid) return false;

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPasswordPlain, salt);

    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, userId);
    return true;
  }

  static getUserById(userId: number) {
    const user = db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(userId);
    return user;
  }
}
