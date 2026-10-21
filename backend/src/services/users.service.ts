import bcrypt from 'bcryptjs';
import { db } from '../database';

export interface UserSummary {
  id: number;
  username: string;
  role: 'admin' | 'operator' | 'viewer';
  status: 'active' | 'disabled';
  created_at: string;
  updated_at: string;
}

export class UsersService {
  static getAllUsers(): UserSummary[] {
    const rows = db.prepare('SELECT id, username, role, status, created_at, updated_at FROM users ORDER BY id ASC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      username: r.username,
      role: r.role || 'viewer',
      status: r.status || 'active',
      created_at: r.created_at,
      updated_at: r.updated_at
    }));
  }

  static getUserById(id: number): UserSummary | null {
    const row = db.prepare('SELECT id, username, role, status, created_at, updated_at FROM users WHERE id = ?').get(id) as UserSummary | undefined;
    return row || null;
  }

  static createUser(data: {
    username: string;
    passwordPlain: string;
    role: 'admin' | 'operator' | 'viewer';
  }): UserSummary {
    const cleanUsername = data.username.trim();
    if (!cleanUsername || cleanUsername.length < 3) {
      throw new Error('O nome de usuário deve ter pelo menos 3 caracteres.');
    }

    if (!data.passwordPlain || data.passwordPlain.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres.');
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
    if (existing) {
      throw new Error(`O usuário "${cleanUsername}" já existe no sistema.`);
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(data.passwordPlain, salt);

    const stmt = db.prepare('INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, ?, ?)');
    const res = stmt.run(cleanUsername, hash, data.role || 'viewer', 'active');

    return this.getUserById(Number(res.lastInsertRowid))!;
  }

  static updateUser(id: number, data: {
    role?: 'admin' | 'operator' | 'viewer';
    status?: 'active' | 'disabled';
  }, requesterId: number): UserSummary {
    const user = this.getUserById(id);
    if (!user) throw new Error('Usuário não encontrado.');

    // Protect the last active administrator
    if (user.role === 'admin' && (data.role && data.role !== 'admin' || data.status === 'disabled')) {
      const adminCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND status = 'active' AND id != ?").get(id) as any).count;
      if (adminCount === 0) {
        throw new Error('Operação bloqueada: o sistema precisa manter pelo menos um Administrador ativo.');
      }
    }

    const newRole = data.role || user.role;
    const newStatus = data.status || user.status;

    db.prepare('UPDATE users SET role = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      newRole,
      newStatus,
      id
    );

    return this.getUserById(id)!;
  }

  static resetPassword(id: number, newPasswordPlain: string): boolean {
    const user = this.getUserById(id);
    if (!user) throw new Error('Usuário não encontrado.');

    if (!newPasswordPlain || newPasswordPlain.length < 6) {
      throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(newPasswordPlain, salt);

    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hash, id);
    return true;
  }

  static deleteUser(id: number, requesterId: number): boolean {
    const user = this.getUserById(id);
    if (!user) throw new Error('Usuário não encontrado.');

    if (id === requesterId) {
      throw new Error('Você não pode excluir sua própria conta de usuário.');
    }

    // Protect last active administrator
    if (user.role === 'admin') {
      const adminCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND status = 'active' AND id != ?").get(id) as any).count;
      if (adminCount === 0) {
        throw new Error('Operação bloqueada: não é permitido excluir o único Administrador ativo do sistema.');
      }
    }

    db.prepare('DELETE FROM user_servers WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return true;
  }
}
