import { pgTable, text, boolean, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";

// Mỗi phòng chơi Online là một dòng: toàn bộ GameRoom (người chơi, trạng thái trận) lưu trong `data`.
// `version` dùng cho khóa lạc quan (optimistic locking) và để client biết khi nào cần tải lại trạng thái.
// `presence` lưu thời điểm poll gần nhất của từng người chơi, cập nhật riêng để không làm tăng `version`.
export const rooms = pgTable(
  "rooms",
  {
    id: text().primaryKey(),
    status: text().notNull().default("LOBBY"),
    isPublic: boolean("is_public").notNull().default(true),
    version: integer().notNull().default(0),
    data: jsonb().notNull(),
    presence: jsonb().notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("rooms_lobby_idx").on(t.isPublic, t.status), index("rooms_updated_idx").on(t.updatedAt)]
);
