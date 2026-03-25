import type { Prisma } from "@prisma/client";

export function normalizeTicketSearchTerm(value: string) {
  return value.trim();
}

export function buildTicketSearchWhere(search: string): Prisma.TicketWhereInput {
  if (!search) {
    return {};
  }

  const ticketNumber = extractSearchTicketNumber(search);
  const searchDigits = search.replace(/\D/g, "");
  const customerOr: Prisma.CustomerWhereInput[] = [
    {
      name: {
        contains: search,
        mode: "insensitive",
      },
    },
    {
      email: {
        contains: search,
        mode: "insensitive",
      },
    },
  ];

  if (searchDigits) {
    customerOr.push({
      phone: {
        contains: searchDigits,
      },
    });
  }

  return {
    OR: [
      ...(ticketNumber !== null ? [{ number: ticketNumber }] : []),
      {
        subject: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        customer: {
          is: {
            OR: customerOr,
          },
        },
      },
    ],
  };
}

function extractSearchTicketNumber(search: string) {
  const prefixedNumber = extractTicketNumber(search);

  if (prefixedNumber !== null) {
    return prefixedNumber;
  }

  return /^\d+$/.test(search) ? Number(search) : null;
}

function extractTicketNumber(id: string) {
  const match = id.match(/CH-(\d+)/i);
  return match ? Number(match[1]) : null;
}
