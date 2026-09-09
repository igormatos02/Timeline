import { userRepository } from '../../infrastructure/database/supabase/SupabaseUserRepository.js';

export class AuthService {
  async registerWithEmail({ name, email, password }) {
    if (!email || !email.trim()) {
      throw new Error('O email é obrigatório.');
    }
    if (!password || password.length < 4) {
      throw new Error('A palavra-passe deve ter pelo menos 4 caracteres.');
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await userRepository.findByEmail(cleanEmail);
    if (existing) {
      throw new Error('Já existe uma conta registada com este endereço de email.');
    }

    const cleanName = (name && name.trim()) || cleanEmail.split('@')[0];

    const created = await userRepository.create({
      name: cleanName,
      email: cleanEmail,
      password: password, // In production you can hash with bcrypt
      googleId: null,
      avatarUrl: null
    });

    return created.toJSON();
  }

  async loginWithEmail({ email, password }) {
    if (!email || !password) {
      throw new Error('Email e palavra-passe são obrigatórios.');
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await userRepository.findByEmail(cleanEmail);
    if (!user) {
      throw new Error('Não foi encontrada nenhuma conta com este email.');
    }

    // If user registered with Google and has no password
    if (!user.password && user.googleId) {
      throw new Error('Esta conta foi criada com o Google. Por favor utilize o botão "Entrar com Google".');
    }

    if (user.password && user.password !== password) {
      throw new Error('Palavra-passe incorreta.');
    }

    return user.toJSON();
  }

  async loginOrRegisterWithGoogle({ googleId, email, name, avatarUrl }) {
    if (!googleId) {
      throw new Error('google_id é obrigatório para autenticação com Google.');
    }

    const cleanEmail = email ? email.toLowerCase().trim() : null;

    // 1. Check if user with this google_id already exists
    let user = await userRepository.findByGoogleId(googleId);
    if (user) {
      return user.toJSON();
    }

    // 2. Check if user with this email exists -> link google_id
    if (cleanEmail) {
      user = await userRepository.findByEmail(cleanEmail);
      if (user) {
        const updated = await userRepository.update(user.id, {
          googleId: googleId,
          avatarUrl: avatarUrl || user.avatarUrl
        });
        return updated.toJSON();
      }
    }

    // 3. Create new user with google_id and password = null
    const cleanName = (name && name.trim()) || (cleanEmail ? cleanEmail.split('@')[0] : 'Utilizador Google');
    const created = await userRepository.create({
      name: cleanName,
      email: cleanEmail,
      password: null,
      googleId: googleId,
      avatarUrl: avatarUrl || null
    });

    return created.toJSON();
  }
}

export const authService = new AuthService();
