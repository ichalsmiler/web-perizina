import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import jwt from "jsonwebtoken";
import { signAdminToken, verifyAdminToken } from "./auth";

test("admin sessions reject unsafe secrets and forged tokens", () => {
  const originalSecret = process.env.JWT_SECRET;
  const payload = { sub: "test-admin", email: "admin@example.test", fullName: "Admin" };
  try {
    for (const secret of [undefined, "", "local-dev-secret-change-me", "change-me-to-a-long-random-string"]) {
      if (secret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = secret;
      assert.throws(() => signAdminToken(payload), /JWT_SECRET/);
      assert.equal(verifyAdminToken(jwt.sign(payload, secret || "fallback")), null);
    }

    const secret = randomBytes(48).toString("base64");
    process.env.JWT_SECRET = secret;
    const token = signAdminToken(payload);
    assert.deepEqual(verifyAdminToken(token), payload);
    assert.equal(verifyAdminToken(jwt.sign(payload, "local-dev-secret-change-me")), null);
    assert.equal(verifyAdminToken(jwt.sign(payload, secret, { algorithm: "HS384", expiresIn: "1h" })), null);
    assert.equal(verifyAdminToken(jwt.sign(payload, secret, { expiresIn: -1 })), null);
    assert.equal(verifyAdminToken(jwt.sign({ sub: "test-admin" }, secret, { expiresIn: "1h" })), null);
    assert.equal(verifyAdminToken(jwt.sign(payload, secret)), null);
    assert.equal(verifyAdminToken("invalid-token"), null);

    process.env.JWT_SECRET = randomBytes(48).toString("base64");
    assert.equal(verifyAdminToken(token), null, "rotating the secret revokes old sessions");
  } finally {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  }
});
