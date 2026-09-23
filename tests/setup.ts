import { beforeEach } from "vitest";
import { closeDb } from "@/lib/db";

// NODE_ENV is "test" under Vitest, so lib/db uses an in-memory PGlite
// database. Reset it before each test for isolation and a fresh seed.
beforeEach(() => {
  closeDb();
});
