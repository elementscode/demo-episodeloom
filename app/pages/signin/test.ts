import { test, assert, equal, session, AuthError } from "@elements/app";
import { signin } from "#app/shared/services/auth";
import { makeUser } from "#app/shared/services/fixtures";

test("signin", () => {
  makeUser("host@example.com", "Host");

  function refused(email: string, password: string): boolean {
    try {
      signin(email, password);
      return false;
    } catch (err) {
      assert(err instanceof AuthError, `got ${err}`);
      return true;
    }
  }

  test("the right password signs in, whatever the email's case", () => {
    signin("Host@Example.com", "password123");
    equal(session.get("userName"), "Host");
  });

  test("a wrong password or unknown email is refused", () => {
    equal(refused("host@example.com", "wrong"), true);
    equal(refused("nobody@example.com", "password123"), true);
    equal(session.isLoggedIn(), false);
  });
});
