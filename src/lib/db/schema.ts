import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  decimal,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const userRoles = ['default', 'admin'] as const;
export type UserRole = (typeof userRoles)[number];

export const userRoleEnum = pgEnum('user_role', userRoles);

export const eventFormats = [
  'breakfast_brunch_lunch',
  'dinner',
  'experiential',
  'hackathon',
  'happy_hour',
  'matchmaking',
  'networking',
  'panel_fireside_chat',
  'pitch_event_demo_day',
  'roundtable_workshop',
] as const;
export type EventFormat = (typeof eventFormats)[number];

export const eventFormatEnum = pgEnum('event_format', eventFormats);

export const eventStates = [
  'submitted',
  'rejected',
  'waiting-luma-edit',
  'published',
  'deleted',
] as const;
export type EventState = (typeof eventStates)[number];

export const eventStateEnum = pgEnum('event_state', eventStates);

// Core User table
export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  encryptedPassword: varchar('encrypted_password', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  role: userRoleEnum('role').notNull().default('default'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type User = InferSelectModel<typeof user>;
export type InsertUser = InferInsertModel<typeof user>;

// Public user type without sensitive data (excludes encryptedPassword)
export type PublicUser = Omit<User, 'encryptedPassword'>;

export const outboundEmails = pgTable('OutboundEmails', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  templateName: varchar('template_name', { length: 100 }).notNull(),
  to: varchar('to', { length: 255 }).notNull(),
  cc: json('cc').$type<string[]>(), // JSON array of email addresses
  bcc: json('bcc').$type<string[]>(), // JSON array of email addresses
  subject: varchar('subject', { length: 500 }).notNull(),
  htmlContent: text('html_content').notNull(),
  textContent: text('text_content'),
  templateData: json('template_data'), // JSON data used to render template
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, sent, failed
  sentAt: timestamp('sent_at', { withTimezone: true }),
  failureReason: text('failure_reason'),
  externalMessageId: varchar('external_message_id', { length: 255 }), // Resend message ID
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type OutboundEmail = InferSelectModel<typeof outboundEmails>;
export type InsertOutboundEmail = InferInsertModel<typeof outboundEmails>;

// Landing page subscription table
export const landingSub = pgTable('LandingSub', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type LandingSub = InferSelectModel<typeof landingSub>;
export type InsertLandingSub = InferInsertModel<typeof landingSub>;

// Events table
export const events = pgTable('Events', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  publicId: uuid('public_id').notNull().defaultRandom(),

  // Author information
  authorEmail: varchar('author_email', { length: 255 }).notNull(),
  authorName: varchar('author_name', { length: 255 }).notNull(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  companyWebsite: varchar('company_website', { length: 500 }).notNull(),
  authorPhoneNumber: varchar('author_phone_number', { length: 50 }).notNull(),

  // Event details
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description').notNull(),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),

  // Location
  commune: varchar('commune', { length: 255 }).notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),

  // Event properties
  format: eventFormatEnum('format').notNull(),
  capacity: integer('capacity').notNull().default(100),
  lumaLink: varchar('luma_link', { length: 500 }),
  companyLogoUrl: varchar('company_logo_url', { length: 500 }).notNull(),

  // Luma integration
  lumaEventApiId: varchar('luma_event_api_id', { length: 255 }),
  lumaEventUrl: varchar('luma_event_url', { length: 500 }),
  lumaEventCreatedAt: timestamp('luma_event_created_at', {
    withTimezone: true,
  }),

  // Status
  state: eventStateEnum('state').notNull().default('submitted'),
  submittedAt: timestamp('submitted_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  waitingLumaEditAt: timestamp('waiting_luma_edit_at', { withTimezone: true }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Event = InferSelectModel<typeof events>;
export type InsertEvent = InferInsertModel<typeof events>;

// Event themes table
export const eventThemes = pgTable('EventThemes', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type EventTheme = InferSelectModel<typeof eventThemes>;
export type InsertEventTheme = InferInsertModel<typeof eventThemes>;

// Event theme relations (many-to-many)
export const eventThemeRelations = pgTable('EventThemeRelations', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  themeId: uuid('theme_id')
    .notNull()
    .references(() => eventThemes.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type EventThemeRelation = InferSelectModel<typeof eventThemeRelations>;
export type InsertEventThemeRelation = InferInsertModel<
  typeof eventThemeRelations
>;

// Event audiences table
export const eventAudiences = pgTable('EventAudiences', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type EventAudience = InferSelectModel<typeof eventAudiences>;
export type InsertEventAudience = InferInsertModel<typeof eventAudiences>;

// Event audience relations (many-to-many)
export const eventAudienceRelations = pgTable('EventAudienceRelations', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  audienceId: uuid('audience_id')
    .notNull()
    .references(() => eventAudiences.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type EventAudienceRelation = InferSelectModel<
  typeof eventAudienceRelations
>;
export type InsertEventAudienceRelation = InferInsertModel<
  typeof eventAudienceRelations
>;

// Event co-hosts table
export const eventCohosts = pgTable('EventCohosts', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),

  // Company information
  companyName: varchar('company_name', { length: 255 }).notNull(),
  companyLogoUrl: varchar('company_logo_url', { length: 500 }),

  // Primary contact details
  primaryContactName: varchar('primary_contact_name', {
    length: 255,
  }).notNull(),
  primaryContactEmail: varchar('primary_contact_email', {
    length: 255,
  }).notNull(),
  primaryContactPhoneNumber: varchar('primary_contact_phone_number', {
    length: 50,
  }),
  primaryContactWebsite: varchar('primary_contact_website', { length: 500 }),
  primaryContactLinkedin: varchar('primary_contact_linkedin', { length: 500 }),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type EventCohost = InferSelectModel<typeof eventCohosts>;
export type InsertEventCohost = InferInsertModel<typeof eventCohosts>;

// Database relations
export const eventsRelations = relations(events, ({ many }) => ({
  cohosts: many(eventCohosts),
  themes: many(eventThemeRelations),
  audiences: many(eventAudienceRelations),
}));

export const eventCohostsRelations = relations(eventCohosts, ({ one }) => ({
  event: one(events, {
    fields: [eventCohosts.eventId],
    references: [events.id],
  }),
}));

export const eventThemeRelationsRelations = relations(
  eventThemeRelations,
  ({ one }) => ({
    event: one(events, {
      fields: [eventThemeRelations.eventId],
      references: [events.id],
    }),
    theme: one(eventThemes, {
      fields: [eventThemeRelations.themeId],
      references: [eventThemes.id],
    }),
  }),
);

export const eventThemesRelations = relations(eventThemes, ({ many }) => ({
  events: many(eventThemeRelations),
}));

export const eventAudienceRelationsRelations = relations(
  eventAudienceRelations,
  ({ one }) => ({
    event: one(events, {
      fields: [eventAudienceRelations.eventId],
      references: [events.id],
    }),
    audience: one(eventAudiences, {
      fields: [eventAudienceRelations.audienceId],
      references: [eventAudiences.id],
    }),
  }),
);

export const eventAudiencesRelations = relations(
  eventAudiences,
  ({ many }) => ({
    events: many(eventAudienceRelations),
  }),
);
