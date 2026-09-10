import { userRepository } from '../../infrastructure/database/supabase/SupabaseUserRepository.js';
import { personRepository } from '../../infrastructure/database/supabase/SupabasePersonRepository.js';
import { timeboardInvitationRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardInvitationRepository.js';
import { timeboardMemberRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardMemberRepository.js';
import { createT } from '../../../shared/i18n/index.js';

const t = createT('en');

export class AuthService {
  async _postAuthSync(user) {
    if (!user || !user.id || !user.email) return;
    const cleanEmail = user.email.toLowerCase().trim();
    try {
      // 1. Link any existing persons rows in any timeboard with this email
      await personRepository.linkUserByEmail(cleanEmail, user.id);

      // 2. Auto-accept and join timeboards with pending invitations for this email
      const invites = await timeboardInvitationRepository.getAll();
      const matchingInvites = (invites || []).filter(
        (inv) => inv.email && inv.email.toLowerCase().trim() === cleanEmail
      );
      for (const inv of matchingInvites) {
        if (inv.timeboardId) {
          try {
            await timeboardMemberRepository.addMember(inv.timeboardId, user.id);
            await timeboardInvitationRepository.markAsAccepted(inv.timeboardId, cleanEmail);
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('[AuthService._postAuthSync] warning:', err.message);
    }
  }

  async registerWithEmail({ name, email, password }) {
    if (!email || !email.trim()) {
      throw new Error(t('backend.validation.emailRequired'));
    }
    if (!password || password.length < 4) {
      throw new Error(t('backend.validation.passwordMinLength'));
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await userRepository.findByEmail(cleanEmail);
    if (existing) {
      throw new Error(t('backend.validation.emailAlreadyExists'));
    }

    const cleanName = (name && name.trim()) || cleanEmail.split('@')[0];

    const created = await userRepository.create({
      name: cleanName,
      email: cleanEmail,
      password: password, // In production you can hash with bcrypt
      googleId: null,
      avatarUrl: null
    });

    const userObj = created.toJSON();
    await this._postAuthSync(userObj);
    return userObj;
  }

  async loginWithEmail({ email, password }) {
    if (!email || !password) {
      throw new Error(t('backend.validation.emailAndPasswordRequired'));
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await userRepository.findByEmail(cleanEmail);
    if (!user) {
      throw new Error(t('backend.validation.accountNotFound'));
    }

    // If user registered with Google and has no password
    if (!user.password && user.googleId) {
      throw new Error(t('backend.validation.googleAccountOnly'));
    }

    if (user.password && user.password !== password) {
      throw new Error(t('backend.validation.incorrectPassword'));
    }

    const userObj = user.toJSON();
    await this._postAuthSync(userObj);
    return userObj;
  }

  async loginOrRegisterWithGoogle({ googleId, email, name, avatarUrl }) {
    if (!googleId) {
      throw new Error(t('backend.validation.googleIdRequired'));
    }

    const cleanEmail = email ? email.toLowerCase().trim() : null;

    // 1. Check if user with this google_id already exists
    let user = await userRepository.findByGoogleId(googleId);
    if (user) {
      const userObj = user.toJSON();
      await this._postAuthSync(userObj);
      return userObj;
    }

    // 2. Check if user with this email exists -> link google_id
    if (cleanEmail) {
      user = await userRepository.findByEmail(cleanEmail);
      if (user) {
        const updated = await userRepository.update(user.id, {
          googleId: googleId,
          avatarUrl: avatarUrl || user.avatarUrl
        });
        const userObj = updated.toJSON();
        await this._postAuthSync(userObj);
        return userObj;
      }
    }

    // 3. Create new user with google_id and password = null
    const cleanName = (name && name.trim()) || (cleanEmail ? cleanEmail.split('@')[0] : t('backend.service.googleUserFallback'));
    const created = await userRepository.create({
      name: cleanName,
      email: cleanEmail,
      password: null,
      googleId: googleId,
      avatarUrl: avatarUrl || null
    });

    const userObj = created.toJSON();
    await this._postAuthSync(userObj);
    return userObj;
  }
}

export const authService = new AuthService();
