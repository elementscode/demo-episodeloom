import { sql, session, AuthError } from "@elements/app";

export const MIN_PASSWORD = 8;

export interface SignupForm {
  name: string;
  email: string;
  password: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

/** @rpc */
export function signin(email: string, password: string) {
  let address = normalizeEmail(email);

  if (!address || !password) {
    throw new AuthError("Enter your email and password.");
  }

  let user = sql<{ id: string; name: string }>(
    `select id, name from users
     where email = ${address}
       and passwordHash = crypt(${password}, passwordHash)`,
  ).first();

  if (!user) {
    throw new AuthError("Invalid email or password.");
  }

  session.login({ userId: user.id, userName: user.name });
}

/** @rpc */
export function signup(form: SignupForm) {
  let address = normalizeEmail(form.email);
  let name = form.name.trim();

  if (!name) {
    throw new AuthError("Enter your name.");
  }

  if (!isEmail(address)) {
    throw new AuthError("Enter a valid email address.");
  }

  if (form.password.length < MIN_PASSWORD) {
    throw new AuthError(`Your password needs at least ${MIN_PASSWORD} characters.`);
  }

  let taken = !sql(`select 1 from users where email = ${address}`).empty();

  if (taken) {
    throw new AuthError("That email is already registered.");
  }

  let user = sql<{ id: string }>(
    `insert into users (email, name, passwordHash)
     values (${address}, ${name}, crypt(${form.password}, genSalt('bf', 12)))
     returning id`,
  ).firstOrThrow();

  session.login({ userId: user.id, userName: name });
}

/** @rpc */
export function signout() {
  session.logout();
}
