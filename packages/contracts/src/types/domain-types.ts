export type EntityId = string;
export type ISODateString = string;

export const userRoles = ["admin", "tecnico", "supervisor"] as const;
export type UserRole = (typeof userRoles)[number];

export const visitFieldStatuses = ["pendiente", "en_progreso", "completada"] as const;
export type VisitFieldStatus = (typeof visitFieldStatuses)[number];
