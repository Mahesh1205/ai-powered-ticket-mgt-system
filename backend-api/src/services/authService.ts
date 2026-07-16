import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { findByEmail } from "../repositories/userRepository";
import type { UserDTO, LoginResponse } from "../types/index";

/**
 * Authenticate a user with email and password.
 * Issues a JWT with sub, email, role, iat, and exp claims (24h expiry).
 *
 * Returns a LoginResponse on success, or null if credentials are invalid.
 * Uses the same null return for both wrong email and wrong password
 * to prevent user enumeration.
 */
export async function login(email: string, password: string): Promise<LoginResponse | null> {
  const user = await findByEmail(email);

  if (!user) {
    return null;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    return null;
  }

  const jwtSecret = process.env.JWT_SECRET!;

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    iat: now,
    exp: now + 24 * 60 * 60, // 24 hours
  };

  const token = jwt.sign(payload, jwtSecret);

  const userDTO: UserDTO = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  return { token, user: userDTO };
}
