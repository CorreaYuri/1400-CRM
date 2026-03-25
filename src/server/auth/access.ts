import "server-only";
import { cache } from "react";
import type { UserRole } from "@prisma/client";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";

export type AccessActor = {
  id: string;
  tenantId: string;
  role: UserRole;
  name: string;
  email: string;
  avatarUrl?: string | null;
};

const getSessionActor = cache(async (): Promise<AccessActor | null> => {
  const session = await getSession();

  if (!session) {
    return null;
  }

  return {
    id: session.user.id,
    tenantId: session.user.tenantId,
    role: session.user.role,
    name: session.user.name,
    email: session.user.email,
    avatarUrl: session.user.avatarUrl ?? null,
  };
});

const getActorById = cache(async (actorUserId: string): Promise<AccessActor | null> => {
  const sessionActor = await getSessionActor();

  if (sessionActor?.id === actorUserId) {
    return sessionActor;
  }

  const user = await db.user.findFirst({
    where: {
      id: actorUserId,
      isActive: true,
    },
    select: {
      id: true,
      tenantId: true,
      role: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  });

  return user;
});

export async function resolveAccessActor(actorUserId?: string): Promise<AccessActor | null> {
  if (actorUserId) {
    return getActorById(actorUserId);
  }

  return getSessionActor();
}

export function isAdmin(actor: AccessActor) {
  return actor.role === "ADMIN";
}

export function isManager(actor: AccessActor) {
  return actor.role === "MANAGER";
}

export function hasTenantWideAccess(actor: AccessActor) {
  return isAdmin(actor) || isManager(actor);
}

export function canRouteAcrossTenant(actor: AccessActor) {
  return isAdmin(actor) || isManager(actor);
}

const getCachedAccessibleInboxIds = cache(async (actorId: string, tenantId: string) => {
  const memberships = await db.inboxMembership.findMany({
    where: {
      userId: actorId,
      inbox: {
        tenantId,
        isActive: true,
      },
    },
    select: {
      inboxId: true,
    },
  });

  return memberships.map((membership: (typeof memberships)[number]) => membership.inboxId);
});

export async function getAccessibleInboxIds(actor: AccessActor) {
  if (hasTenantWideAccess(actor)) {
    return null;
  }

  return getCachedAccessibleInboxIds(actor.id, actor.tenantId);
}

export async function canAccessInbox(actor: AccessActor, inboxId: string) {
  if (hasTenantWideAccess(actor)) {
    return true;
  }

  const accessibleInboxIds = await getAccessibleInboxIds(actor);
  return accessibleInboxIds?.includes(inboxId) ?? false;
}

export async function canOperateInbox(actor: AccessActor, inboxId: string) {
  return canAccessInbox(actor, inboxId);
}

