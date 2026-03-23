/* eslint-disable */
/** auto generated, do not edit */
import { pgTable, index, uniqueIndex, pgPolicy, uuid, varchar, text, foreignKey, customType } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

/** Escape single quotes in SQL string literals */
function escapeLiteral(str: string): string {
  return `'${str.replace(/'/g, "''")}'`;
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number};
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number){
    if(value == null) return value as any;
    if (typeof value === 'number') {
      return new Date(value).toISOString();
    }
    if(typeof value === 'string') {
      return value;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if(value instanceof Date) return value;
    return new Date(value);
  },
});

export const translation = pgTable("translation", {
  id: uuid().defaultRandom().notNull(),
  namespace: varchar({ length: 50 }).notNull(),
  language: varchar({ length: 10 }).notNull(),
  keyPath: varchar("key_path", { length: 500 }).notNull(),
  value: text().notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  index("idx_translation_language").using("btree", table.language.asc().nullsLast().op("text_ops")),
  index("idx_translation_namespace").using("btree", table.namespace.asc().nullsLast().op("text_ops")),
  uniqueIndex("idx_translation_unique").using("btree", table.namespace.asc().nullsLast().op("text_ops"), table.language.asc().nullsLast().op("text_ops"), table.keyPath.asc().nullsLast().op("text_ops")),
  pgPolicy("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadjwp5mgq4ls"], using: sql`((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = (_created_by)::text))` }),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadjwp5mgq4ls", "authenticated_workspace_aadjwp5mgq4ls"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadjwp5mgq4ls"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadjwp5mgq4ls"] }),
]);

export const safetyCheckEvent = pgTable("safety_check_event", {
  id: uuid().defaultRandom().notNull(),
  eventType: varchar("event_type", { length: 255 }).notNull(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  notificationScope: text("notification_scope").notNull(),
  sendType: varchar("send_type", { length: 255 }).default('immediate').notNull(),
  sendTime: customTimestamptz('send_time').notNull(),
  deadlineTime: customTimestamptz('deadline_time').notNull(),
  status: varchar({ length: 255 }).default('draft').notNull(),
  creator: userProfile("creator").notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  index("idx_safety_check_event_creator").using("btree", sql`((creator).user_id)`),
  index("idx_safety_check_event_send_time").using("btree", table.sendTime.asc().nullsLast().op("timestamptz_ops")),
  index("idx_safety_check_event_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
  pgPolicy("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadjwp5mgq4ls"], using: sql`((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = (_created_by)::text))` }),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadjwp5mgq4ls", "authenticated_workspace_aadjwp5mgq4ls"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadjwp5mgq4ls"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadjwp5mgq4ls"] }),
]);

export const employeeFeedback = pgTable("employee_feedback", {
  id: uuid().defaultRandom().notNull(),
  eventId: uuid("event_id").notNull(),
  employeeId: userProfile("employee_id").notNull(),
  employeeName: varchar("employee_name", { length: 255 }).notNull(),
  department: varchar({ length: 255 }),
  feedbackStatus: varchar("feedback_status", { length: 255 }).default('no_response').notNull(),
  feedbackTime: customTimestamptz('feedback_time'),
  lastNotifyTime: customTimestamptz('last_notify_time'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
  employeeOpenId: varchar("employee_open_id", { length: 255 }),
}, (table) => [
  index("idx_employee_feedback_employee").using("btree", sql`((employee_id).user_id)`),
  index("idx_employee_feedback_event_id").using("btree", table.eventId.asc().nullsLast().op("uuid_ops")),
  index("idx_employee_feedback_open_id").using("btree", table.employeeOpenId.asc().nullsLast().op("text_ops")),
  index("idx_employee_feedback_status").using("btree", table.feedbackStatus.asc().nullsLast().op("text_ops")),
  foreignKey({
    columns: [table.eventId],
    foreignColumns: [safetyCheckEvent.id],
    name: "employee_feedback_event_id_fkey"
  }).onDelete("cascade"),
  pgPolicy("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadjwp5mgq4ls"], using: sql`((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = (_created_by)::text))` }),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadjwp5mgq4ls", "authenticated_workspace_aadjwp5mgq4ls"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadjwp5mgq4ls"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadjwp5mgq4ls"] }),
]);

// table aliases
export const employeeFeedbackTable = employeeFeedback;
export const safetyCheckEventTable = safetyCheckEvent;
export const translationTable = translation;
