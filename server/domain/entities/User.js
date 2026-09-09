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
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.password = password;
    this.googleId = googleId;
    this.avatarUrl = avatarUrl;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      googleId: this.googleId,
      avatarUrl: this.avatarUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
