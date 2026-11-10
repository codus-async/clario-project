import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { PrismaPg } from "@prisma/adapter-pg";
import { RoleCode } from "@clario/shared-contracts";
import { Client } from "pg";
import { GenericContainer, Wait, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppError } from "../../../errors/app-error.js";
import { ERROR_CODES } from "../../../errors/error-codes.js";
import { PrismaClient, type Prisma } from "../../../generated/prisma/client.js";
import {
  TENANT_CONTEXT_GUC,
  withTenantTransaction,
  type TenantContext,
} from "../../../infrastructure/database/tenant-transaction.js";

const execFileAsync = promisify(execFile);

const BACKEND_ROOT = fileURLToPath(new URL("../../../..", import.meta.url));
const REPO_ROOT = fileURLToPath(new URL("../../../../..", import.meta.url));
const MIGRATIONS_DIR = join(BACKEND_ROOT, "prisma", "migrations");
const SCHEMA_SQL_PATH = join(REPO_ROOT, "docs", "clario_mvp_schema.sql");
const PRISMA_BIN = join(BACKEND_ROOT, "node_modules", ".bin", "prisma7");

const POSTGRES_USER = "clario_admin";
const POSTGRES_PASSWORD = "Clario_Dev_DB_2026_StrongPassword";
const POSTGRES_DB = "clario";

const ZERO_HASH = "0".repeat(64);

/**
 * Runs the transaction helper against the containerised database under test
 * instead of the application singleton, which points at the developer database.
 */
function tenantTx<T>(
  context: TenantContext,
  handler: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return withTenantTransaction(context, handler, { client: db });
}

let container: StartedTestContainer;
let sql: Client;
let db: PrismaClient;
let connectionString: string;
let schemaSql: string;

let alphaInstitutionId: string;
let betaInstitutionId: string;
let alphaFacultyId: string;
let betaFacultyId: string;

const alphaContext: TenantContext = {
  institutionId: "",
  isPlatformAdmin: false,
  activeRole: RoleCode.INSTITUTIONAL_ADMIN,
  coordinatorAppointmentId: null,
};

function firstRow<T>(rows: readonly T[]): T {
  const row = rows[0];
  if (row === undefined) {
    throw new Error("expected at least one row in the result set");
  }
  return row;
}

function collectErrorText(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current instanceof Error; depth += 1) {
    parts.push(current.message);
    const meta = (current as Error & { meta?: unknown }).meta;
    if (meta !== undefined && meta !== null) {
      parts.push(typeof meta === "string" ? meta : JSON.stringify(meta));
    }
    current = current.cause;
  }
  if (current !== undefined && current !== null) {
    parts.push(typeof current === "string" ? current : JSON.stringify(current));
  }
  return parts.join(" | ");
}

async function expectDatabaseError(
  action: Promise<unknown>,
  pattern: RegExp,
): Promise<void> {
  let caught: unknown;
  let rejected = false;
  try {
    await action;
  } catch (error) {
    caught = error;
    rejected = true;
  }
  expect(rejected, "expected the database operation to be rejected").toBe(true);
  expect(collectErrorText(caught)).toMatch(pattern);
}

function createTableBodies(source: string): Map<string, string> {
  const bodies = new Map<string, string>();
  const pattern = /CREATE TABLE (\w+)\s*\(/g;
  let match: RegExpExecArray | null = pattern.exec(source);
  while (match !== null) {
    const start = pattern.lastIndex;
    let depth = 1;
    let index = start;
    while (index < source.length && depth > 0) {
      const character = source[index];
      if (character === "(") depth += 1;
      if (character === ")") depth -= 1;
      index += 1;
    }
    bodies.set(String(match[1]), source.slice(start, index - 1));
    match = pattern.exec(source);
  }
  return bodies;
}

function checkCount(body: string): number {
  let count = 0;
  let searchFrom = 0;
  for (;;) {
    const found = body.indexOf("CHECK (", searchFrom);
    if (found < 0) return count;
    const open = body.indexOf("(", found);
    let depth = 0;
    let index = open;
    while (index < body.length) {
      if (body[index] === "(") depth += 1;
      if (body[index] === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
      index += 1;
    }
    count += 1;
    searchFrom = index + 1;
  }
}

function extractTenantTableNames(source: string): string[] {
  const block = source.match(/tenant_tables TEXT\[\] := ARRAY\[([\s\S]*?)\];/);
  const entries = block?.[1];
  if (entries === undefined) {
    throw new Error("tenant_tables ARRAY block not found in clario_mvp_schema.sql");
  }
  return [...entries.matchAll(/'([a-z0-9_]+)'/g)].map((entry) => String(entry[1]));
}

function extractIndexNames(source: string): string[] {
  return [...source.matchAll(/\bCREATE (?:UNIQUE )?INDEX (\w+)/g)].map((entry) =>
    String(entry[1]),
  );
}

function extractTriggers(source: string): Array<{ name: string; table: string }> {
  const triggers: Array<{ name: string; table: string }> = [];
  const lines = source.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const header = lines[index]?.match(/^\s*CREATE TRIGGER (\w+)/);
    if (header === null || header === undefined) continue;
    let table = "";
    for (
      let line = index + 1;
      line < lines.length && line <= index + 6 && table === "";
      line += 1
    ) {
      const on = lines[line]?.match(/\bON ([a-z0-9_]+)\s*$/);
      if (on !== null && on !== undefined) table = String(on[1]);
    }
    triggers.push({ name: String(header[1]), table });
  }
  return triggers;
}

beforeAll(async () => {
  schemaSql = await readFile(SCHEMA_SQL_PATH, "utf8");

  container = await new GenericContainer("postgres:16")
    .withEnvironment({ POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/, 2))
    .start();

  connectionString = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${container.getHost()}:${String(
    container.getMappedPort(5432),
  )}/${POSTGRES_DB}`;

  sql = new Client({ connectionString });
  await sql.connect();

  const migrations = (await readdir(MIGRATIONS_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  expect(migrations.length).toBeGreaterThanOrEqual(8);
  for (const migration of migrations) {
    const statement = await readFile(join(MIGRATIONS_DIR, migration, "migration.sql"), "utf8");
    await sql.query(statement);
  }

  const institutions = await sql.query<{ id: string }>(
    `INSERT INTO institutions (name, code_slug, primary_contact_name, primary_contact_email)
     VALUES ('Institution Alpha', 'TENA', 'Alpha Contact', 'alpha@example.edu'),
            ('Institution Beta', 'TENB', 'Beta Contact', 'beta@example.edu')
     RETURNING id`,
  );
  alphaInstitutionId = firstRow(institutions.rows).id;
  betaInstitutionId = institutions.rows[1]?.id ?? "";
  alphaContext.institutionId = alphaInstitutionId;

  const faculties = await sql.query<{ id: string; institution_id: string }>(
    `INSERT INTO faculties (institution_id, name, code)
     VALUES ($1, 'Faculty Alpha', 'FAL'), ($2, 'Faculty Beta', 'FBT')
     RETURNING id, institution_id`,
    [alphaInstitutionId, betaInstitutionId],
  );
  for (const faculty of faculties.rows) {
    if (faculty.institution_id === alphaInstitutionId) alphaFacultyId = faculty.id;
    if (faculty.institution_id === betaInstitutionId) betaFacultyId = faculty.id;
  }
  expect(alphaFacultyId).toBeDefined();
  expect(betaFacultyId).toBeDefined();

  db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}, 300_000);

afterAll(async () => {
  await db?.$disconnect();
  await sql?.end();
  await container?.stop();
}, 60_000);

describe("schema conformance (docs/clario_mvp_schema.sql)", () => {
  it("applies every table defined by the authoritative physical schema", async () => {
    const tables = await sql.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
    );
    const existing = new Set(tables.rows.map((row) => row.table_name));

    for (const name of createTableBodies(schemaSql).keys()) {
      expect(existing.has(name), `table ${name} must exist`).toBe(true);
    }
    expect(createTableBodies(schemaSql).size).toBe(44);
  });

  it("creates the required PostgreSQL extensions", async () => {
    const extensions = await sql.query<{ extname: string }>(`SELECT extname FROM pg_extension`);
    const names = new Set(extensions.rows.map((row) => row.extname));
    for (const extension of ["pgcrypto", "citext", "btree_gist"]) {
      expect(names.has(extension), `extension ${extension} must exist`).toBe(true);
    }
  });

  it("creates the database roles with their least-privilege attributes", async () => {
    const roles = await sql.query<{
      rolname: string;
      rolcanlogin: boolean;
      rolinherit: boolean;
      rolbypassrls: boolean;
    }>(
      `SELECT rolname, rolcanlogin, rolinherit, rolbypassrls FROM pg_roles
       WHERE rolname IN ('clario_app_role', 'clario_audit_reader_role', 'clario_worker_role', 'clario_app')`,
    );
    const byName = new Map(roles.rows.map((row) => [row.rolname, row]));

    const appRole = byName.get("clario_app_role");
    expect(appRole).toBeDefined();
    expect(appRole?.rolcanlogin).toBe(false);
    expect(appRole?.rolinherit).toBe(false);
    expect(appRole?.rolbypassrls).toBe(false);

    const workerRole = byName.get("clario_worker_role");
    expect(workerRole?.rolbypassrls).toBe(true);
    expect(workerRole?.rolcanlogin).toBe(false);
    expect(byName.get("clario_audit_reader_role")?.rolcanlogin).toBe(false);
    expect(byName.get("clario_app")?.rolcanlogin).toBe(true);

    const membership = await sql.query(
      `SELECT 1 FROM pg_auth_members m
       JOIN pg_roles granted ON granted.oid = m.roleid
       JOIN pg_roles member ON member.oid = m.member
       WHERE granted.rolname = 'clario_app_role' AND member.rolname = 'clario_app'`,
    );
    expect(membership.rows.length).toBe(1);
  });

  it("keeps immutable audit and version tables out of application-role mutation grants", async () => {
    const grants = await sql.query<{ table_name: string; privilege_type: string }>(
      `SELECT table_name, privilege_type FROM information_schema.role_table_grants
       WHERE grantee = 'clario_app_role'
         AND table_name IN ('audit_logs', 'submission_versions', 'storage_objects')`,
    );
    const privileges = (table: string): Set<string> =>
      new Set(
        grants.rows
          .filter((row) => row.table_name === table)
          .map((row) => row.privilege_type),
      );

    const audit = privileges("audit_logs");
    expect(audit.has("SELECT")).toBe(true);
    expect(audit.has("INSERT")).toBe(true);
    expect(audit.has("UPDATE")).toBe(false);
    expect(audit.has("DELETE")).toBe(false);
    expect(privileges("submission_versions").has("DELETE")).toBe(false);
    expect(privileges("storage_objects").has("DELETE")).toBe(false);
  });

  it("keeps every constraint defined by the authoritative physical schema", async () => {
    const constraints = await sql.query<{ table_name: string; contype: string; total: string }>(
      `SELECT rel.relname AS table_name, con.contype, count(*)::text AS total
       FROM pg_constraint con
       JOIN pg_class rel ON rel.oid = con.conrelid
       JOIN pg_namespace ns ON ns.oid = rel.relnamespace
       WHERE ns.nspname = 'public' AND rel.relkind = 'r'
       GROUP BY 1, 2`,
    );
    const counts = new Map(
      constraints.rows.map((row) => [`${row.table_name}:${row.contype}`, Number(row.total)]),
    );

    for (const [table, body] of createTableBodies(schemaSql)) {
      expect(
        counts.get(`${table}:p`) ?? 0,
        `primary key constraint on ${table}`,
      ).toBe((body.match(/\bPRIMARY KEY\b/g) ?? []).length);
      expect(
        counts.get(`${table}:f`) ?? 0,
        `foreign key constraints on ${table}`,
      ).toBe((body.match(/\bREFERENCES\b/g) ?? []).length);
      expect(
        counts.get(`${table}:u`) ?? 0,
        `unique constraints on ${table}`,
      ).toBe((body.match(/\bUNIQUE\b/g) ?? []).length);
      expect(counts.get(`${table}:c`) ?? 0, `check constraints on ${table}`).toBe(checkCount(body));
    }
  });

  it("keeps every tenant-scoped index defined by the authoritative physical schema", async () => {
    const indexes = await sql.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`,
    );
    const existing = new Set(indexes.rows.map((row) => row.indexname));
    const declared = extractIndexNames(schemaSql);
    expect(declared.length).toBe(90);
    for (const name of declared) {
      expect(existing.has(name), `index ${name} must exist`).toBe(true);
    }
  });

  it("enables and forces row-level security with a tenant isolation policy per tenant table", async () => {
    const secured = await sql.query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      `SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
       FROM pg_class c
       JOIN pg_namespace ns ON ns.oid = c.relnamespace
       WHERE ns.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = true`,
    );
    const securedTables = secured.rows.map((row) => row.relname).sort();
    expect(securedTables).toEqual(extractTenantTableNames(schemaSql).sort());
    expect(secured.rows.every((row) => row.relforcerowsecurity)).toBe(true);

    const policies = await sql.query<{
      tablename: string;
      policyname: string;
      cmd: string;
      roles: string;
      qual: string;
      with_check: string;
    }>(
      `SELECT tablename, policyname, cmd, array_to_string(roles, ',') AS roles, qual, with_check
       FROM pg_policies WHERE schemaname = 'public'`,
    );
    expect(policies.rows.length).toBe(extractTenantTableNames(schemaSql).length);
    for (const policy of policies.rows) {
      expect(policy.policyname).toBe("tenant_isolation_policy");
      expect(policy.cmd).toBe("ALL");
      expect(policy.roles).toBe("clario_app_role");
      expect(policy.qual).toContain("current_app_institution_id()");
      expect(policy.with_check).toContain("current_app_institution_id()");
    }
  });

  it("keeps every trigger defined by the authoritative physical schema", async () => {
    const triggers = await sql.query<{ tgname: string; relname: string }>(
      `SELECT t.tgname, rel.relname
       FROM pg_trigger t
       JOIN pg_class rel ON rel.oid = t.tgrelid
       JOIN pg_namespace ns ON ns.oid = rel.relnamespace
       WHERE ns.nspname = 'public' AND t.tgisinternal = false`,
    );
    const byName = new Map(triggers.rows.map((row) => [row.tgname, row.relname]));
    const declared = extractTriggers(schemaSql);
    expect(declared.length).toBe(7);
    for (const trigger of declared) {
      expect(byName.get(trigger.name), `trigger ${trigger.name}`).toBe(trigger.table);
    }
  });

  it("reconciles the Prisma datamodel with the authoritative physical schema", async () => {
    const { stdout, stderr } = await execFileAsync(
      PRISMA_BIN,
      [
        "migrate",
        "diff",
        "--from-config-datasource",
        "--to-schema",
        "prisma/schema.prisma",
        "--config",
        "prisma7.config.ts",
      ],
      {
        cwd: BACKEND_ROOT,
        env: {
          ...process.env,
          DATABASE_URL: connectionString,
          DIRECT_URL: connectionString,
        },
        maxBuffer: 10 * 1024 * 1024,
      },
    );
    expect(`${stdout}${stderr}`).toContain("No difference detected");
  }, 120_000);
});

describe("audit immutability and hash chain (F-82, FR-282)", () => {
  it("chains per-tenant hashes and rejects updates and deletes", async () => {
    const insertAudit = async (institutionId: string, targetId: string) => {
      const result = await sql.query<{ id: string; previous_row_hash: string; row_integrity_hash: string }>(
        `INSERT INTO audit_logs
           (institution_id, actor_role, action_code, target_entity_type, target_entity_id, outcome)
         VALUES ($1, 'INSTITUTIONAL_ADMIN', 'TEST_EVENT', 'faculties', $2, 'SUCCESS')
         RETURNING id, previous_row_hash, row_integrity_hash`,
        [institutionId, targetId],
      );
      return firstRow(result.rows);
    };

    const alphaFirst = await insertAudit(alphaInstitutionId, alphaFacultyId);
    expect(alphaFirst.previous_row_hash).toBe(ZERO_HASH);
    expect(alphaFirst.row_integrity_hash).toMatch(/^[0-9a-f]{64}$/);

    const alphaSecond = await insertAudit(alphaInstitutionId, alphaFacultyId);
    expect(alphaSecond.previous_row_hash).toBe(alphaFirst.row_integrity_hash);

    const betaFirst = await insertAudit(betaInstitutionId, betaFacultyId);
    expect(betaFirst.previous_row_hash).toBe(ZERO_HASH);

    await expectDatabaseError(
      sql.query(`UPDATE audit_logs SET action_code = 'TAMPERED' WHERE id = $1`, [alphaFirst.id]),
      /TAMPER_PROTECTION_VIOLATION/,
    );
    await expectDatabaseError(
      sql.query(`DELETE FROM audit_logs WHERE id = $1`, [alphaFirst.id]),
      /TAMPER_PROTECTION_VIOLATION/,
    );

    const unchanged = await sql.query<{ action_code: string }>(
      `SELECT action_code FROM audit_logs WHERE id = $1`,
      [alphaFirst.id],
    );
    expect(firstRow(unchanged.rows).action_code).toBe("TEST_EVENT");
  });

  it("denies audit mutation to the application role while still allowing hashed inserts", async () => {
    await expectDatabaseError(
      tenantTx(alphaContext, (tx) =>
        tx.$executeRaw`UPDATE audit_logs SET action_code = 'TAMPERED'`,
      ),
      /permission denied for table audit_logs/i,
    );
    await expectDatabaseError(
      tenantTx(alphaContext, (tx) => tx.$executeRaw`DELETE FROM audit_logs`),
      /permission denied for table audit_logs/i,
    );

    const tipBefore = await sql.query<{ row_integrity_hash: string }>(
      `SELECT row_integrity_hash FROM audit_logs
       WHERE institution_id = $1 ORDER BY sequence_num DESC LIMIT 1`,
      [alphaInstitutionId],
    );
    const expectedPrevious = firstRow(tipBefore.rows).row_integrity_hash;

    const inserted = await tenantTx(alphaContext, (tx) =>
      tx.$queryRaw<Array<{ previous_row_hash: string }>>`
        INSERT INTO audit_logs
          (institution_id, actor_role, action_code, target_entity_type, target_entity_id, outcome)
        VALUES (${alphaInstitutionId}, 'INSTITUTIONAL_ADMIN', 'ROLE_INSERT', 'faculties', ${alphaFacultyId}, 'SUCCESS')
        RETURNING previous_row_hash`,
    );
    expect(firstRow(inserted).previous_row_hash).toBe(expectedPrevious);
  });
});

describe("tenant isolation (BR-01, SEC-09)", () => {
  it("exposes every institution to the migration role, as the isolation control", async () => {
    const control = await sql.query<{ total: number }>(`SELECT count(*)::int AS total FROM faculties`);
    expect(firstRow(control.rows).total).toBe(2);

    const crossTenantRow = await sql.query<{ id: string }>(`SELECT id FROM faculties WHERE id = $1`, [
      betaFacultyId,
    ]);
    expect(crossTenantRow.rows.length).toBe(1);
  });

  it("returns only the session institution's rows to a tenant-scoped query", async () => {
    const result = await tenantTx(alphaContext, async (tx) => {
      const models = await tx.faculties.findMany();
      const raw = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM faculties`;
      const byId = await tx.faculties.findUnique({ where: { id: betaFacultyId } });
      return { models, raw, byId };
    });

    expect(result.models.map((faculty) => faculty.id)).toEqual([alphaFacultyId]);
    expect(new Set(result.raw.map((row) => row.id))).toEqual(new Set([alphaFacultyId]));
    expect(result.byId).toBeNull();
  });

  it("blocks a tenant-scoped write that targets another institution", async () => {
    await expectDatabaseError(
      tenantTx(alphaContext, (tx) =>
        tx.$executeRaw`
          INSERT INTO faculties (institution_id, name, code)
          VALUES (${betaInstitutionId}, 'Cross Border Faculty', 'CBF')`,
      ),
      /row-level security/i,
    );

    const rows = await sql.query<{ code: string }>(`SELECT code FROM faculties WHERE code = 'CBF'`);
    expect(rows.rows.length).toBe(0);
  });

  it("reports zero affected rows for updates and deletes targeting another institution", async () => {
    const counts = await tenantTx(alphaContext, async (tx) => {
      const updated = await tx.faculties.updateMany({
        where: { id: betaFacultyId },
        data: { name: "Hijacked Faculty" },
      });
      const deleted = await tx.faculties.deleteMany({ where: { id: betaFacultyId } });
      return { updated: updated.count, deleted: deleted.count };
    });
    expect(counts).toEqual({ updated: 0, deleted: 0 });

    const untouched = await sql.query<{ name: string }>(`SELECT name FROM faculties WHERE id = $1`, [
      betaFacultyId,
    ]);
    expect(firstRow(untouched.rows).name).toBe("Faculty Beta");
  });

  it("switches tenant scope between institutions without leaking", async () => {
    const alphaRows = await tenantTx(alphaContext, (tx) =>
      tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM faculties`,
    );
    expect(new Set(alphaRows.map((row) => row.id))).toEqual(new Set([alphaFacultyId]));

    const betaContext: TenantContext = {
      ...alphaContext,
      institutionId: betaInstitutionId,
      activeRole: RoleCode.INSTITUTIONAL_ADMIN,
    };
    const betaRows = await tenantTx(betaContext, (tx) =>
      tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM faculties`,
    );
    expect(new Set(betaRows.map((row) => row.id))).toEqual(new Set([betaFacultyId]));
  });

  it("clears the session scope as soon as the transaction ends", async () => {
    await tenantTx(alphaContext, async (tx) => {
      await tx.faculties.findMany();
    });

    const afterCommit = await db.$queryRaw<Array<{ institution_id: string | null; active_role: string | null }>>`
      SELECT current_app_institution_id() AS institution_id, current_app_active_role() AS active_role`;
    expect(firstRow(afterCommit).institution_id).toBeNull();
    expect(firstRow(afterCommit).active_role).toBeNull();
  });
});

describe("tenant transaction context", () => {
  it("binds the four session variables and the row-level security role", async () => {
    const appointmentId = randomUUID();
    const coordinatorContext: TenantContext = {
      institutionId: alphaInstitutionId,
      isPlatformAdmin: false,
      activeRole: RoleCode.PROJECT_COORDINATOR,
      coordinatorAppointmentId: appointmentId,
    };

    const rows = await tenantTx(coordinatorContext, (tx) =>
      tx.$queryRaw<
        Array<{
          guc_institution: string;
          guc_platform_admin: string;
          guc_active_role: string;
          guc_appointment: string;
          session_role: string;
          reader_institution: string | null;
          reader_platform_admin: boolean;
          reader_active_role: string | null;
          reader_appointment: string | null;
        }>
      >`
        SELECT
          current_setting(${TENANT_CONTEXT_GUC.institutionId}, false) AS guc_institution,
          current_setting(${TENANT_CONTEXT_GUC.isPlatformAdmin}, false) AS guc_platform_admin,
          current_setting(${TENANT_CONTEXT_GUC.activeRole}, false) AS guc_active_role,
          current_setting(${TENANT_CONTEXT_GUC.coordinatorAppointmentId}, false) AS guc_appointment,
          current_user::text AS session_role,
          current_app_institution_id() AS reader_institution,
          is_platform_admin_context() AS reader_platform_admin,
          current_app_active_role() AS reader_active_role,
          current_app_coordinator_appointment_id() AS reader_appointment`,
    );

    const row = firstRow(rows);
    expect(row.guc_institution).toBe(alphaInstitutionId);
    expect(row.guc_platform_admin).toBe("false");
    expect(row.guc_active_role).toBe("PROJECT_COORDINATOR");
    expect(row.guc_appointment).toBe(appointmentId);
    expect(row.session_role).toBe("clario_app_role");
    expect(row.reader_institution).toBe(alphaInstitutionId);
    expect(row.reader_platform_admin).toBe(false);
    expect(row.reader_active_role).toBe("PROJECT_COORDINATOR");
    expect(row.reader_appointment).toBe(appointmentId);
  });

  it("scopes a platform admin session to platform tables, outside tenant rows", async () => {
    const platformContext: TenantContext = {
      institutionId: null,
      isPlatformAdmin: true,
      activeRole: RoleCode.PLATFORM_ADMIN,
      coordinatorAppointmentId: null,
    };

    const result = await tenantTx(platformContext, async (tx) => {
      const readers = await tx.$queryRaw<Array<{ institution_id: string | null; is_platform_admin: boolean }>>`
        SELECT current_app_institution_id() AS institution_id, is_platform_admin_context() AS is_platform_admin`;
      return {
        reader: firstRow(readers),
        tenantFaculties: await tx.faculties.count(),
        platformSettings: await tx.platform_subscription_settings.count(),
      };
    });

    expect(result.reader.institution_id).toBeNull();
    expect(result.reader.is_platform_admin).toBe(true);
    expect(result.tenantFaculties).toBe(0);
    expect(result.platformSettings).toBeGreaterThanOrEqual(1);
  });

  it("rejects an active coordinator without an appointment scope (BR-03)", async () => {
    const error = await tenantTx(
      {
        institutionId: alphaInstitutionId,
        isPlatformAdmin: false,
        activeRole: RoleCode.PROJECT_COORDINATOR,
        coordinatorAppointmentId: null,
      },
      async () => "handler must not run",
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppError);
    const appError = error as AppError;
    expect(appError.code).toBe(ERROR_CODES.OUT_OF_ASSIGNMENT_SCOPE);
    expect(appError.status).toBe(403);
    expect(appError.fieldErrors?.map((field) => field.field)).toContain(
      "coordinatorAppointmentId",
    );
  });

  it("rejects a tenant session without an institution (BR-01, SEC-09)", async () => {
    const error = await tenantTx(
      {
        institutionId: null,
        isPlatformAdmin: false,
        activeRole: RoleCode.STUDENT,
        coordinatorAppointmentId: null,
      },
      async () => "handler must not run",
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(ERROR_CODES.OUT_OF_ASSIGNMENT_SCOPE);
    expect((error as AppError).fieldErrors?.map((field) => field.field)).toContain(
      "institutionId",
    );
  });

  it("rejects a platform admin session pinned to an institution", async () => {
    const error = await tenantTx(
      {
        institutionId: alphaInstitutionId,
        isPlatformAdmin: true,
        activeRole: RoleCode.PLATFORM_ADMIN,
        coordinatorAppointmentId: null,
      },
      async () => "handler must not run",
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(ERROR_CODES.OUT_OF_ASSIGNMENT_SCOPE);
    expect((error as AppError).fieldErrors?.map((field) => field.field)).toContain(
      "institutionId",
    );
  });

  it("rejects malformed session identifiers", async () => {
    const error = await tenantTx(
      {
        institutionId: "not-a-uuid",
        isPlatformAdmin: false,
        activeRole: RoleCode.INSTITUTIONAL_ADMIN,
        coordinatorAppointmentId: null,
      },
      async () => "handler must not run",
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(ERROR_CODES.OUT_OF_ASSIGNMENT_SCOPE);
  });
});
