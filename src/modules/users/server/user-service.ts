import "server-only";
import type { Prisma, UserRole } from "@prisma/client";
import { logAuditEvent } from "@/modules/audit/server/audit-service";
import { hashPassword } from "@/server/auth/password";
import { db } from "@/server/db";
import { removeAvatarFile, saveAvatarFile } from "@/modules/users/server/avatar-storage";

type UserTransactionClient = {
  inboxMembership: typeof db.inboxMembership;
  user: typeof db.user;
};

type ManageableUserRecord = {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  isActive: boolean;
  avatarUrl: string | null;
  inboxMemberships: Array<{
    inbox: {
      id: string;
      name: string;
    };
  }>;
};

export type UserInboxMembershipItem = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl: string | null;
  inboxIds: string[];
  inboxNames: string[];
};

export type ManageableInboxOption = {
  id: string;
  name: string;
};

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  inboxIds: string[];
};

export type UpdateUserInput = {
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  inboxIds: string[];
};

export async function getUsersWithInboxMemberships(tenantId: string) {
  const [users, inboxes] = await Promise.all([
    db.user.findMany({
      where: { tenantId },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      include: {
        inboxMemberships: {
          include: {
            inbox: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            inbox: {
              name: "asc",
            },
          },
        },
      },
    }),
    db.inbox.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  return {
    users: users.map((user: (typeof users)[number]): UserInboxMembershipItem => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      avatarUrl: user.avatarUrl,
      inboxIds: user.inboxMemberships.map((membership: (typeof user.inboxMemberships)[number]) => membership.inbox.id),
      inboxNames: user.inboxMemberships.map((membership: (typeof user.inboxMemberships)[number]) => membership.inbox.name),
    })),
    inboxes: inboxes.map((inbox: (typeof inboxes)[number]): ManageableInboxOption => ({
      id: inbox.id,
      name: inbox.name,
    })),
  };
}

export async function createUser(
  tenantId: string,
  actorUserId: string,
  actorRole: UserRole,
  input: CreateUserInput,
) {
  if (actorRole !== "ADMIN" && input.role === "ADMIN") {
    return {
      ok: false as const,
      status: 403,
      error: "Apenas administradores podem criar outro usuario ADMIN.",
    };
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  const allowedInboxes = await getValidatedInboxIds(tenantId, input.inboxIds);

  if (!allowedInboxes.ok) {
    return allowedInboxes;
  }

  const existingUser = await db.user.findFirst({
    where: {
      tenantId,
      email: normalizedEmail,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    return {
      ok: false as const,
      status: 409,
      error: "Ja existe um usuario com este email neste tenant.",
    };
  }

  const passwordHash = hashPassword(input.password);
  let createdUserId = "";

  await db.$transaction(async (tx) => {
    const transaction = tx as UserTransactionClient;
    const user = await transaction.user.create({
      data: {
        tenantId,
        name: input.name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: input.role,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    createdUserId = user.id;

    if (input.inboxIds.length > 0) {
      await transaction.inboxMembership.createMany({
        data: input.inboxIds.map((inboxId) => ({
          userId: user.id,
          inboxId,
        })),
      });
    }
  });

  await logAuditEvent({
    tenantId,
    userId: actorUserId,
    entityType: "USER",
    entityId: createdUserId,
    action: "USER_CREATED",
    payload: {
      name: input.name.trim(),
      email: normalizedEmail,
      role: input.role,
      inboxIds: input.inboxIds,
    } satisfies Prisma.InputJsonObject,
  });

  return {
    ok: true as const,
    status: 201,
    data: {
      message: "Usuario criado com sucesso.",
    },
  };
}

export async function updateUser(
  tenantId: string,
  actorUserId: string,
  actorRole: UserRole,
  userId: string,
  input: UpdateUserInput,
) {
  const user = await getManageableUser(tenantId, userId);

  if (!user) {
    return {
      ok: false as const,
      status: 404,
      error: "Usuario nao encontrado.",
    };
  }

  if (actorRole !== "ADMIN" && (user.role === "ADMIN" || input.role === "ADMIN")) {
    return {
      ok: false as const,
      status: 403,
      error: "Apenas administradores podem editar um usuario ADMIN.",
    };
  }

  if (actorUserId === user.id && !input.isActive) {
    return {
      ok: false as const,
      status: 400,
      error: "Voce nao pode desativar o proprio usuario.",
    };
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  const allowedInboxes = await getValidatedInboxIds(tenantId, input.inboxIds);

  if (!allowedInboxes.ok) {
    return allowedInboxes;
  }

  const existingUser = await db.user.findFirst({
    where: {
      tenantId,
      email: normalizedEmail,
      id: {
        not: user.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    return {
      ok: false as const,
      status: 409,
      error: "Ja existe outro usuario com este email neste tenant.",
    };
  }

  await db.$transaction(async (tx) => {
    const transaction = tx as UserTransactionClient;

    await transaction.user.update({
      where: { id: user.id },
      data: {
        name: input.name.trim(),
        email: normalizedEmail,
        role: input.role,
        isActive: input.isActive,
      },
    });

    await transaction.inboxMembership.deleteMany({
      where: {
        userId: user.id,
      },
    });

    if (input.inboxIds.length > 0) {
      await transaction.inboxMembership.createMany({
        data: input.inboxIds.map((inboxId) => ({
          userId: user.id,
          inboxId,
        })),
      });
    }
  });

  await logAuditEvent({
    tenantId,
    userId: actorUserId,
    entityType: "USER",
    entityId: user.id,
    action: "USER_UPDATED",
    payload: {
      previous: {
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        inboxIds: user.inboxMemberships.map((membership: (typeof user.inboxMemberships)[number]) => membership.inbox.id),
      },
      next: {
        name: input.name.trim(),
        email: normalizedEmail,
        role: input.role,
        isActive: input.isActive,
        inboxIds: input.inboxIds,
      },
    } satisfies Prisma.InputJsonObject,
  });

  return {
    ok: true as const,
    status: 200,
    data: {
      message: "Usuario atualizado com sucesso.",
    },
  };
}

export async function resetUserPassword(
  tenantId: string,
  actorUserId: string,
  actorRole: UserRole,
  userId: string,
  password: string,
) {
  const user = await db.user.findFirst({
    where: {
      id: userId,
      tenantId,
    },
    select: {
      id: true,
      role: true,
      email: true,
    },
  });

  if (!user) {
    return {
      ok: false as const,
      status: 404,
      error: "Usuario nao encontrado.",
    };
  }

  if (actorRole !== "ADMIN" && user.role === "ADMIN") {
    return {
      ok: false as const,
      status: 403,
      error: "Apenas administradores podem redefinir a senha de um usuario ADMIN.",
    };
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(password),
    },
  });

  await logAuditEvent({
    tenantId,
    userId: actorUserId,
    entityType: "USER",
    entityId: user.id,
    action: "USER_PASSWORD_RESET",
    payload: {
      email: user.email,
      targetRole: user.role,
    } satisfies Prisma.InputJsonObject,
  });

  return {
    ok: true as const,
    status: 200,
    data: {
      message: "Senha redefinida com sucesso.",
    },
  };
}

export async function updateUserAvatar(
  tenantId: string,
  actorUserId: string,
  actorRole: UserRole,
  userId: string,
  file: File,
) {
  const user = await getManageableUser(tenantId, userId);

  if (!user) {
    return {
      ok: false as const,
      status: 404,
      error: "Usuario nao encontrado.",
    };
  }

  if (actorRole !== "ADMIN" && user.role === "ADMIN") {
    return {
      ok: false as const,
      status: 403,
      error: "Apenas administradores podem atualizar a foto de um usuario ADMIN.",
    };
  }

  let avatarUrl = "";

  try {
    avatarUrl = await saveAvatarFile(file);

    await db.user.update({
      where: { id: user.id },
      data: { avatarUrl },
    });

    await removeAvatarFile(user.avatarUrl);
  } catch (error) {
    await removeAvatarFile(avatarUrl);

    return {
      ok: false as const,
      status: 400,
      error: error instanceof Error ? error.message : "Nao foi possivel salvar a foto do usuario.",
    };
  }

  await logAuditEvent({
    tenantId,
    userId: actorUserId,
    entityType: "USER",
    entityId: user.id,
    action: "USER_AVATAR_UPDATED",
    payload: {
      email: user.email,
      targetRole: user.role,
      avatarUrl,
    } satisfies Prisma.InputJsonObject,
  });

  return {
    ok: true as const,
    status: 200,
    data: {
      message: "Foto atualizada com sucesso.",
      avatarUrl,
    },
  };
}

export async function removeUserAvatar(
  tenantId: string,
  actorUserId: string,
  actorRole: UserRole,
  userId: string,
) {
  const user = await getManageableUser(tenantId, userId);

  if (!user) {
    return {
      ok: false as const,
      status: 404,
      error: "Usuario nao encontrado.",
    };
  }

  if (actorRole !== "ADMIN" && user.role === "ADMIN") {
    return {
      ok: false as const,
      status: 403,
      error: "Apenas administradores podem remover a foto de um usuario ADMIN.",
    };
  }

  if (!user.avatarUrl) {
    return {
      ok: true as const,
      status: 200,
      data: {
        message: "Usuario ja estava sem foto cadastrada.",
      },
    };
  }

  await db.user.update({
    where: { id: user.id },
    data: { avatarUrl: null },
  });

  await removeAvatarFile(user.avatarUrl);

  await logAuditEvent({
    tenantId,
    userId: actorUserId,
    entityType: "USER",
    entityId: user.id,
    action: "USER_AVATAR_REMOVED",
    payload: {
      email: user.email,
      targetRole: user.role,
    } satisfies Prisma.InputJsonObject,
  });

  return {
    ok: true as const,
    status: 200,
    data: {
      message: "Foto removida com sucesso.",
    },
  };
}

export async function softDeleteUser(
  tenantId: string,
  actorUserId: string,
  actorRole: UserRole,
  userId: string,
) {
  const user = await getManageableUser(tenantId, userId);

  if (!user) {
    return {
      ok: false as const,
      status: 404,
      error: "Usuario nao encontrado.",
    };
  }

  if (actorRole !== "ADMIN" && user.role === "ADMIN") {
    return {
      ok: false as const,
      status: 403,
      error: "Apenas administradores podem excluir logicamente um usuario ADMIN.",
    };
  }

  if (actorUserId === user.id) {
    return {
      ok: false as const,
      status: 400,
      error: "Voce nao pode excluir logicamente o proprio usuario.",
    };
  }

  await db.$transaction(async (tx) => {
    const transaction = tx as UserTransactionClient;

    await transaction.user.update({
      where: { id: user.id },
      data: {
        isActive: false,
      },
    });

    await transaction.inboxMembership.deleteMany({
      where: {
        userId: user.id,
      },
    });
  });

  await logAuditEvent({
    tenantId,
    userId: actorUserId,
    entityType: "USER",
    entityId: user.id,
    action: "USER_SOFT_DELETED",
    payload: {
      name: user.name,
      email: user.email,
      role: user.role,
      wasActive: user.isActive,
      removedInboxIds: user.inboxMemberships.map((membership: (typeof user.inboxMemberships)[number]) => membership.inbox.id),
    } satisfies Prisma.InputJsonObject,
  });

  return {
    ok: true as const,
    status: 200,
    data: {
      message: "Usuario arquivado com sucesso.",
    },
  };
}

export async function hardDeleteUser(
  tenantId: string,
  actorUserId: string,
  actorRole: UserRole,
  userId: string,
) {
  const user = await getManageableUser(tenantId, userId);

  if (!user) {
    return {
      ok: false as const,
      status: 404,
      error: "Usuario nao encontrado.",
    };
  }

  if (actorRole !== "ADMIN" && user.role === "ADMIN") {
    return {
      ok: false as const,
      status: 403,
      error: "Apenas administradores podem excluir definitivamente um usuario ADMIN.",
    };
  }

  if (actorUserId === user.id) {
    return {
      ok: false as const,
      status: 400,
      error: "Voce nao pode excluir definitivamente o proprio usuario.",
    };
  }

  const dependencyCounts = await getUserDeletionDependencyCounts(tenantId, user.id);
  const blockingDependencies = [
    dependencyCounts.createdTickets > 0 ? `${dependencyCounts.createdTickets} chamado(s) criado(s)` : null,
    dependencyCounts.authoredInteractions > 0 ? `${dependencyCounts.authoredInteractions} registro(s) na timeline` : null,
    dependencyCounts.schedules > 0 ? `${dependencyCounts.schedules} agendamento(s)` : null,
  ].filter((item): item is string => Boolean(item));

  if (blockingDependencies.length > 0) {
    return {
      ok: false as const,
      status: 409,
      error: `Nao e possivel excluir definitivamente este usuario porque ele possui historico operacional (${blockingDependencies.join(", ")}). Arquive o usuario em vez disso.`,
    };
  }

  await db.$transaction(async (tx) => {
    const transaction = tx as UserTransactionClient;

    await transaction.inboxMembership.deleteMany({
      where: {
        userId: user.id,
      },
    });

    await transaction.user.delete({
      where: { id: user.id },
    });
  });

  if (user.avatarUrl) {
    await removeAvatarFile(user.avatarUrl);
  }

  await logAuditEvent({
    tenantId,
    userId: actorUserId,
    entityType: "USER",
    entityId: user.id,
    action: "USER_HARD_DELETED",
    payload: {
      name: user.name,
      email: user.email,
      role: user.role,
      hadAvatar: Boolean(user.avatarUrl),
      removedInboxIds: user.inboxMemberships.map((membership: (typeof user.inboxMemberships)[number]) => membership.inbox.id),
    } satisfies Prisma.InputJsonObject,
  });

  return {
    ok: true as const,
    status: 200,
    data: {
      message: "Usuario excluido definitivamente com sucesso.",
    },
  };
}
export async function updateUserInboxMemberships(tenantId: string, userId: string, inboxIds: string[]) {
  const user = await db.user.findFirst({
    where: {
      id: userId,
      tenantId,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    return {
      ok: false as const,
      status: 404,
      error: "Usuario nao encontrado.",
    };
  }

  const allowedInboxes = await getValidatedInboxIds(tenantId, inboxIds);

  if (!allowedInboxes.ok) {
    return allowedInboxes;
  }

  await db.$transaction(async (tx) => {
    const transaction = tx as UserTransactionClient;

    await transaction.inboxMembership.deleteMany({
      where: {
        userId: user.id,
      },
    });

    if (inboxIds.length > 0) {
      await transaction.inboxMembership.createMany({
        data: inboxIds.map((inboxId) => ({
          userId: user.id,
          inboxId,
        })),
      });
    }
  });

  return {
    ok: true as const,
    status: 200,
    data: {
      message:
        inboxIds.length === 0
          ? "Usuario removido de todas as inboxes."
          : `Usuario vinculado a ${inboxIds.length} inbox(es).`,
    },
  };
}

async function getUserDeletionDependencyCounts(tenantId: string, userId: string) {
  const [createdTickets, authoredInteractions, schedules] = await Promise.all([
    db.ticket.count({
      where: {
        tenantId,
        createdByUserId: userId,
      },
    }),
    db.ticketInteraction.count({
      where: {
        authorId: userId,
        ticket: {
          tenantId,
        },
      },
    }),
    db.ticketSchedule.count({
      where: {
        scheduledById: userId,
        ticket: {
          tenantId,
        },
      },
    }),
  ]);

  return {
    createdTickets,
    authoredInteractions,
    schedules,
  };
}
async function getValidatedInboxIds(tenantId: string, inboxIds: string[]) {
  const allowedInboxes = await db.inbox.findMany({
    where: {
      tenantId,
      isActive: true,
      id: {
        in: inboxIds,
      },
    },
    select: {
      id: true,
    },
  });

  if (allowedInboxes.length !== inboxIds.length) {
    return {
      ok: false as const,
      status: 400,
      error: "Uma ou mais inboxes selecionadas sao invalidas para este tenant.",
    };
  }

  return {
    ok: true as const,
  };
}

async function getManageableUser(tenantId: string, userId: string): Promise<ManageableUserRecord | null> {
  return db.user.findFirst({
    where: {
      id: userId,
      tenantId,
    },
    select: {
      id: true,
      role: true,
      name: true,
      email: true,
      isActive: true,
      avatarUrl: true,
      inboxMemberships: {
        include: {
          inbox: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}

