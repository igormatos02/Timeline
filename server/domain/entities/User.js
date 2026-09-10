/**
 * Entity: User
 * Represents an authenticated user in the Timeline application.
 */
export class User {
  constructor({
    id,
    name = '',
    email = null,
    password = null,
    googleId = null,
    avatarUrl = null,
    createdAt = new Date().toISOString()
  }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.password = password;
    this.googleId = googleId;
    this.avatarUrl = avatarUrl;
    this.createdAt = createdAt;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      googleId: this.googleId,
      avatarUrl: this.avatarUrl,
      createdAt: this.createdAt
    };
  }
}
