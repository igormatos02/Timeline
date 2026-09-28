import { userRepository } from '../../infrastructure/database/supabase/SupabaseUserRepository.js';
import { personRepository } from '../../infrastructure/database/supabase/SupabasePersonRepository.js';
import { timeboardInvitationRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardInvitationRepository.js';
import { timeboardMemberRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardMemberRepository.js';
import { timeboardRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardRepository.js';
import { supabase } from '../../infrastructure/database/supabase/supabaseClient.js';
import { hashPassword, verifyPassword, isHashedPassword } from '../../infrastructure/security/password.js';
import { createSessionToken } from '../../infrastructure/security/sessionToken.js';
import { createT } from '../../../shared/i18n/index.js';

const t = createT('en');

export class AuthService {
  // Auth responses: the public user plus the signed session token used by every API request
  _withSession(userObj) {
    return { ...userObj, token: createSessionToken(userObj) };
  }

  /**
   * Deletes the account (Play Store / GDPR requirement): the user's links to entities and memberships
   * are removed and the Google identity is deleted from Supabase Auth. The entities and payment records
   * stay with the timeboard (they are the administrator's records). Owners must delete their timeboards first.
   */
  async deleteAccount(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error(t('backend.validation.accountNotFound'));

    const owned = await timeboardRepository.findByOwnerId(userId);
    if (owned.length > 0) {
      const err = new Error(t('backend.validation.accountOwnsTimeboards', { names: owned.map((tb) => tb.name).join(', ') }));
      err.status = 409;
      throw err;
    }

    const persons = await personRepository.getByUserId(userId);
    for (const person of persons) {
      await personRepository.update(person.id, { userId: null });
    }
    const memberships = await timeboardMemberRepository.getByUserId(userId);
    for (const membership of memberships) {
      await timeboardMemberRepository.removeMember(membership.timeboardId, userId);
    }
    // Google sign-ins also have a Supabase Auth user (its id is stored as googleId)
    if (user.googleId) {
      try {
        await supabase.auth.admin.deleteUser(user.googleId);
      } catch (err) {
        console.warn('[AuthService.deleteAccount] Supabase Auth user not deleted:', err.message);
      }
    }
    await userRepository.delete(userId);
    return { success: true };
  }

  async getSessionUser(userId) {
    const user = await userRepository.findById(userId);
    return user ? user.toJSON() : null;
  }

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
      password: await hashPassword(password),
      googleId: null,
      avatarUrl: null
    });

    const userObj = created.toJSON();
    await this._postAuthSync(userObj);
    return this._withSession(userObj);
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

    if (!(await verifyPassword(password, user.password))) {
      throw new Error(t('backend.validation.incorrectPassword'));
    }
    // Legacy plain-text passwords are hashed on the first successful login
    if (!isHashedPassword(user.password)) {
      await userRepository.update(user.id, { password: await hashPassword(password) });
    }

    const userObj = user.toJSON();
    await this._postAuthSync(userObj);
    return this._withSession(userObj);
  }

  /**
   * Google login: the client signs in with Google through Supabase Auth (web OAuth or the native
   * Android sign-in) and sends the Supabase access token; the identity is read from Supabase,
   * never trusted from the request body.
   */
  async loginWithSupabaseAccessToken(accessToken) {
    if (!accessToken) throw new Error(t('backend.validation.googleIdRequired'));
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data?.user) throw new Error(t('backend.validation.invalidGoogleSession'));
    const gUser = data.user;
    return this.loginOrRegisterWithGoogle({
      googleId: gUser.id,
      email: gUser.email,
      name: gUser.user_metadata?.full_name || gUser.user_metadata?.name || null,
      avatarUrl: gUser.user_metadata?.avatar_url || gUser.user_metadata?.picture || null
    });
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
      return this._withSession(userObj);
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
        return this._withSession(userObj);
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
    return this._withSession(userObj);
  }
}

export const authService = new AuthService();
