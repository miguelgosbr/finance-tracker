import { beforeEach } from "vitest";
import { closeDb } from "@/lib/db";

process.env.DATABASE_PATH = ":memory:";

// Fresh in-memory database (with default seeds) before each test.
beforeEach(() => {
  closeDb();
});
