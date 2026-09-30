import { test, assert, equal, session, sql, AuthError } from "@elements/app";
import { signup } from "#app/shared/services/auth";

test("signup", () => {
  test("creates an account and signs in", () => {
    signup({ name: "New Host", email: " New@Example.com ", password: "longenough" });

    equal(session.get("userName"), "New Host");
    equal(sql<{ email: string }>(`select email from users where email = 'new@example.com'`).firstOrThrow().email, "new@example.com");
  });

  test("refuses a short password", () => {
    let threw = false;

    try {
      signup({ name: "Short", email: "short@example.com", password: "short" });
    } catch (err) {
      threw = true;
      assert(err instanceof AuthError, `got ${err}`);
    }

    assert(threw);
  });
});
