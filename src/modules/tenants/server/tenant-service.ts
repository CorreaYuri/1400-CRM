import "server-only";
import type { Prisma, UserRole } from "@prisma/client";
import { UserRole as PrismaUserRole } from "@prisma/client";
import { logAuditEvent } from "@/modules/audit/server/audit-service";
import { hashPassword } from "@/server/auth/password";
import { setSessionCookie } from "@/server/auth/session";
import { db } from "@/server/db";

export type RegisterTenantExtraUserInput = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  inboxCodes: string[];
};

export type RegisterTenantInput = {
  tenantName: string;
  tenantSlug: string;
  logoUrl?: string;
  adminName: string;
  adminEmail: string;
  password: string;
  inboxCodes: string[];
  extraUsers: RegisterTenantExtraUserInput[];
};

export type RegisterTenantOptions = {
  signInAfterCreate?: boolean;
};

export type TenantInboxTemplate = {
  code: string;
  name: string;
  description: string;
};

type ResolvedExtraUser = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  inboxCodes: string[];
};

export const DEFAULT_TENANT_INBOXES: TenantInboxTemplate[] = [
  {
    name: "Suporte",
    code: "SUP",
    description: "Atendimento inicial e operacao corrente.",
  },
  {
    name: "Backoffice",
    code: "BKO",
    description: "Tratativas internas, documentos e apoio operacional.",
  },
  {
    name: "Triagem Tecnica",
    code: "TRI",
    description: "Qualificacao tecnica antes de seguir para outras areas.",
  },
  {
    name: "Infra",
    code: "INF",
    description: "Chamados internos de acesso, ambiente e infraestrutura.",
  },
  {
    name: "RH",
    code: "RH",
    description: "Demandas internas de pessoas, admissao, beneficios e politicas.",
  },
  {
    name: "Financeiro",
    code: "FIN",
    description: "Tratativas financeiras, cobrancas e validacoes administrativas.",
  },
  {
    name: "Cobranca",
    code: "COB",
    description: "Recuperacao, follow-up e negociacao de pendencias financeiras.",
  },
];

export async function registerTenant(input: RegisterTenantInput, options: RegisterTenantOptions = {}) {
  const signInAfterCreate = options.signInAfterCreate ?? true;
  const tenantName = input.tenantName.trim();
  const tenantSlug = normalizeSlug(input.tenantSlug);
  const adminName = input.adminName.trim();
  const logoUrl = input.logoUrl?.trim() ? input.logoUrl.trim() : null;
  const adminEmail = input.adminEmail.trim().toLowerCase();
  const inboxTemplates = resolveInboxTemplates(input.inboxCodes);
  const allowedInboxCodes = new Set(inboxTemplates.map((inbox) => inbox.code));
  const extraUsers = normalizeExtraUsers(input.extraUsers, allowedInboxCodes);

  if (inboxTemplates.length === 0) {
    return {
      ok: false as const,
      status: 400,
      error: "Selecione ao menos uma inbox inicial para o tenant.",
    };
  }

  const existingTenant = await db.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });

  if (existingTenant) {
    return {
      ok: false as const,
      status: 409,
      error: "Ja existe um tenant com este identificador.",
    };
  }

  const allEmails = [adminEmail, ...extraUsers.map((user) => user.email)];

  if (new Set(allEmails).size !== allEmails.length) {
    return {
      ok: false as const,
      status: 400,
      error: "Nao repita emails entre administrador e usuarios extras.",
    };
  }

  const usersWithoutInbox = extraUsers.filter((user) => user.inboxCodes.length === 0);

  if (usersWithoutInbox.length > 0) {
    return {
      ok: false as const,
      status: 400,
      error: "Cada usuario extra precisa ser vinculado a pelo menos uma inbox inicial.",
    };
  }

  const adminPasswordHash = hashPassword(input.password);

  const created = await db.$transaction(async (tx) => {
    const transaction = tx as Prisma.TransactionClient & {
      tenant: typeof db.tenant;
      user: typeof db.user;
      inbox: typeof db.inbox;
      inboxMembership: typeof db.inboxMembership;
    };

    const tenant = await transaction.tenant.create({
      data: {
        name: tenantName,
        slug: tenantSlug,
        logoUrl,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
      },
    });

    const admin = await transaction.user.create({
      data: {
        tenantId: tenant.id,
        name: adminName,
        email: adminEmail,
        passwordHash: adminPasswordHash,
        role: PrismaUserRole.ADMIN,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenantId: true,
      },
    });

    const inboxes = [] as Array<{ id: string; name: string; code: string }>;

    for (const inbox of inboxTemplates) {
      const createdInbox = await transaction.inbox.create({
        data: {
          tenantId: tenant.id,
          name: inbox.name,
          code: inbox.code,
          description: inbox.description,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
      });

      inboxes.push(createdInbox);
    }

    const createdInboxMap = new Map(inboxes.map((inbox) => [inbox.code, inbox.id]));
    const createdExtraUsers = [] as Array<{ id: string; name: string; email: string; role: UserRole; inboxCodes: string[] }>;

    for (const extraUser of extraUsers) {
      const createdUser = await transaction.user.create({
        data: {
          tenantId: tenant.id,
          name: extraUser.name,
          email: extraUser.email,
          passwordHash: hashPassword(extraUser.password),
          role: extraUser.role,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      createdExtraUsers.push({
        ...createdUser,
        inboxCodes: extraUser.inboxCodes,
      });
    }

    await transaction.inboxMembership.createMany({
      data: [
        ...inboxes.map((inbox) => ({
          inboxId: inbox.id,
          userId: admin.id,
        })),
        ...createdExtraUsers.flatMap((user) =>
          user.inboxCodes
            .map((code) => createdInboxMap.get(code))
            .filter((inboxId): inboxId is string => Boolean(inboxId))
            .map((inboxId) => ({
              inboxId,
              userId: user.id,
            })),
        ),
      ],
    });

    return {
      tenant,
      admin,
      inboxes,
      createdExtraUsers,
    };
  });

  await logAuditEvent({
    tenantId: created.tenant.id,
    userId: created.admin.id,
    entityType: "TENANT",
    entityId: created.tenant.id,
    action: "TENANT_CREATED",
    payload: {
      tenantName: created.tenant.name,
      tenantSlug: created.tenant.slug,
      adminEmail: created.admin.email,
      logoUrl: created.tenant.logoUrl,
      inboxCodes: created.inboxes.map((inbox: (typeof created.inboxes)[number]) => inbox.code),
      extraUsers: created.createdExtraUsers.map((user: (typeof created.createdExtraUsers)[number]) => ({
        email: user.email,
        role: user.role,
        inboxCodes: user.inboxCodes,
      })),
    } satisfies Prisma.InputJsonObject,
  });

  if (signInAfterCreate) {
    await setSessionCookie({
      id: created.admin.id,
      tenantId: created.admin.tenantId,
      name: created.admin.name,
      email: created.admin.email,
      role: created.admin.role,
    });
  }

  return {
    ok: true as const,
    status: 201,
    data: {
      tenantName: created.tenant.name,
      tenantSlug: created.tenant.slug,
      adminEmail: created.admin.email,
      logoUrl: created.tenant.logoUrl,
      message: signInAfterCreate
        ? "Tenant criado com sucesso. Voce ja entrou como administrador."
        : "Tenant criado com sucesso. Sua sessao da plataforma foi preservada.",
    },
  };
}

function normalizeExtraUsers(extraUsers: RegisterTenantExtraUserInput[], allowedInboxCodes: Set<string>): ResolvedExtraUser[] {
  return extraUsers
    .map((user) => ({
      name: user.name.trim(),
      email: user.email.trim().toLowerCase(),
      password: user.password,
      role: user.role,
      inboxCodes: Array.from(
        new Set(user.inboxCodes.map((code) => code.trim().toUpperCase()).filter((code) => allowedInboxCodes.has(code))),
      ),
    }))
    .filter((user) => user.name && user.email && user.password);
}

function resolveInboxTemplates(inboxCodes: string[]) {
  const normalizedCodes = Array.from(new Set(inboxCodes.map((code) => code.trim().toUpperCase()).filter(Boolean)));
  const templatesByCode = new Map(DEFAULT_TENANT_INBOXES.map((inbox) => [inbox.code, inbox]));

  return normalizedCodes
    .map((code) => templatesByCode.get(code))
    .filter((inbox): inbox is TenantInboxTemplate => Boolean(inbox));
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}


