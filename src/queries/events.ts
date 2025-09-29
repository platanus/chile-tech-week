import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { db } from '@/src/lib/db';
import {
  type Event,
  type EventAudience,
  type EventCohost,
  type EventFormat,
  type EventTheme,
  eventAudienceRelations,
  eventAudiences,
  eventCohosts,
  events,
  eventThemeRelations,
  eventThemes,
} from '@/src/lib/db/schema';

export type EventWithDetails = Event & {
  themes: EventTheme[];
  cohosts: EventCohost[];
  audiences: EventAudience[];
};

export const getAllEvents = async (): Promise<EventWithDetails[]> => {
  const allEvents = await db
    .select()
    .from(events)
    .where(sql`approved_at IS NOT NULL`)
    .orderBy(events.startDate);

  // Get themes, audiences and cohosts for all events
  const eventIds = allEvents.map((event) => event.id);

  const [allThemes, allAudiences, allCohosts] = await Promise.all([
    // Get all themes for these events
    db
      .select({
        eventId: eventThemeRelations.eventId,
        theme: eventThemes,
      })
      .from(eventThemeRelations)
      .innerJoin(eventThemes, eq(eventThemeRelations.themeId, eventThemes.id))
      .where(inArray(eventThemeRelations.eventId, eventIds)),

    // Get all audiences for these events
    db
      .select({
        eventId: eventAudienceRelations.eventId,
        audience: eventAudiences,
      })
      .from(eventAudienceRelations)
      .innerJoin(
        eventAudiences,
        eq(eventAudienceRelations.audienceId, eventAudiences.id),
      )
      .where(inArray(eventAudienceRelations.eventId, eventIds)),

    // Get all cohosts for these events
    db
      .select()
      .from(eventCohosts)
      .where(inArray(eventCohosts.eventId, eventIds)),
  ]);

  // Group themes, audiences and cohosts by event ID
  const themesByEvent = allThemes.reduce(
    (acc, { eventId, theme }) => {
      if (!acc[eventId]) acc[eventId] = [];
      acc[eventId].push(theme);
      return acc;
    },
    {} as Record<string, EventTheme[]>,
  );

  const audiencesByEvent = allAudiences.reduce(
    (acc, { eventId, audience }) => {
      if (!acc[eventId]) acc[eventId] = [];
      acc[eventId].push(audience);
      return acc;
    },
    {} as Record<string, EventAudience[]>,
  );

  const cohostsByEvent = allCohosts.reduce(
    (acc, cohost) => {
      if (!acc[cohost.eventId]) acc[cohost.eventId] = [];
      acc[cohost.eventId].push(cohost);
      return acc;
    },
    {} as Record<string, EventCohost[]>,
  );

  // Combine everything
  return allEvents.map((event) => ({
    ...event,
    themes: themesByEvent[event.id] || [],
    audiences: audiencesByEvent[event.id] || [],
    cohosts: cohostsByEvent[event.id] || [],
  }));
};

export const getEventsByDateRange = async (
  startDate: Date,
  endDate: Date,
): Promise<EventWithDetails[]> => {
  const eventsInRange = await db
    .select()
    .from(events)
    .where(
      and(
        sql`approved_at IS NOT NULL`,
        gte(events.startDate, startDate),
        lte(events.startDate, endDate),
      ),
    )
    .orderBy(events.startDate);

  if (eventsInRange.length === 0) {
    return [];
  }

  const eventIds = eventsInRange.map((event) => event.id);

  const [allThemes, allAudiences, allCohosts] = await Promise.all([
    db
      .select({
        eventId: eventThemeRelations.eventId,
        theme: eventThemes,
      })
      .from(eventThemeRelations)
      .innerJoin(eventThemes, eq(eventThemeRelations.themeId, eventThemes.id))
      .where(inArray(eventThemeRelations.eventId, eventIds)),

    db
      .select({
        eventId: eventAudienceRelations.eventId,
        audience: eventAudiences,
      })
      .from(eventAudienceRelations)
      .innerJoin(
        eventAudiences,
        eq(eventAudienceRelations.audienceId, eventAudiences.id),
      )
      .where(inArray(eventAudienceRelations.eventId, eventIds)),

    db
      .select()
      .from(eventCohosts)
      .where(inArray(eventCohosts.eventId, eventIds)),
  ]);

  const themesByEvent = allThemes.reduce(
    (acc, { eventId, theme }) => {
      if (!acc[eventId]) acc[eventId] = [];
      acc[eventId].push(theme);
      return acc;
    },
    {} as Record<string, EventTheme[]>,
  );

  const audiencesByEvent = allAudiences.reduce(
    (acc, { eventId, audience }) => {
      if (!acc[eventId]) acc[eventId] = [];
      acc[eventId].push(audience);
      return acc;
    },
    {} as Record<string, EventAudience[]>,
  );

  const cohostsByEvent = allCohosts.reduce(
    (acc, cohost) => {
      if (!acc[cohost.eventId]) acc[cohost.eventId] = [];
      acc[cohost.eventId].push(cohost);
      return acc;
    },
    {} as Record<string, EventCohost[]>,
  );

  return eventsInRange.map((event) => ({
    ...event,
    themes: themesByEvent[event.id] || [],
    audiences: audiencesByEvent[event.id] || [],
    cohosts: cohostsByEvent[event.id] || [],
  }));
};

export const getEventById = async (
  id: string,
): Promise<EventWithDetails | null> => {
  const event = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  if (!event[0]) {
    return null;
  }

  const [themes, audiences, cohosts] = await Promise.all([
    db
      .select({
        theme: eventThemes,
      })
      .from(eventThemeRelations)
      .innerJoin(eventThemes, eq(eventThemeRelations.themeId, eventThemes.id))
      .where(eq(eventThemeRelations.eventId, id)),

    db
      .select({
        audience: eventAudiences,
      })
      .from(eventAudienceRelations)
      .innerJoin(
        eventAudiences,
        eq(eventAudienceRelations.audienceId, eventAudiences.id),
      )
      .where(eq(eventAudienceRelations.eventId, id)),

    db.select().from(eventCohosts).where(eq(eventCohosts.eventId, id)),
  ]);

  return {
    ...event[0],
    themes: themes.map((t) => t.theme),
    audiences: audiences.map((a) => a.audience),
    cohosts,
  };
};

export const getAllEventThemes = async (): Promise<EventTheme[]> => {
  return db.select().from(eventThemes).orderBy(eventThemes.name);
};

export const getAllEventAudiences = async (): Promise<EventAudience[]> => {
  return db.select().from(eventAudiences).orderBy(eventAudiences.name);
};

// Admin-specific queries
export type EventStatus =
  | 'submitted'
  | 'rejected'
  | 'waiting-luma-edit'
  | 'published'
  | 'deleted';

export type AdminEventsFilter = {
  status?: EventStatus;
  page?: number;
  limit?: number;
  search?: string;
};

export type AdminEventsResult = {
  events: EventWithDetails[];
  total: number;
  totalPages: number;
  currentPage: number;
};

export const getAdminEvents = async (
  filter: AdminEventsFilter = {},
): Promise<AdminEventsResult> => {
  const { status = 'submitted', page = 1, limit = 10, search } = filter;
  const offset = (page - 1) * limit;

  // Build status condition based on state field
  const statusCondition = eq(events.state, status);

  // Build search condition - simplified to avoid parameter binding issues
  let searchCondition: any;
  if (search?.trim()) {
    const searchTerm = `%${search.trim()}%`;

    // Simple search on main event fields only for now
    searchCondition = or(
      ilike(events.title, searchTerm),
      ilike(events.companyName, searchTerm),
      ilike(events.authorName, searchTerm),
    );
  }

  // Combine conditions
  const whereCondition = searchCondition
    ? and(statusCondition, searchCondition)
    : statusCondition;

  // Get total count
  const [totalResult] = await db
    .select({ count: count() })
    .from(events)
    .where(whereCondition);

  const total = totalResult.count;
  const totalPages = Math.ceil(total / limit);

  // Get events with pagination
  const adminEvents = await db
    .select()
    .from(events)
    .where(whereCondition)
    .orderBy(desc(events.createdAt))
    .limit(limit)
    .offset(offset);

  if (adminEvents.length === 0) {
    return {
      events: [],
      total,
      totalPages,
      currentPage: page,
    };
  }

  // Get themes, audiences and cohosts for these events
  const eventIds = adminEvents.map((event) => event.id);

  const [allThemes, allAudiences, allCohosts] = await Promise.all([
    db
      .select({
        eventId: eventThemeRelations.eventId,
        theme: eventThemes,
      })
      .from(eventThemeRelations)
      .innerJoin(eventThemes, eq(eventThemeRelations.themeId, eventThemes.id))
      .where(inArray(eventThemeRelations.eventId, eventIds)),

    db
      .select({
        eventId: eventAudienceRelations.eventId,
        audience: eventAudiences,
      })
      .from(eventAudienceRelations)
      .innerJoin(
        eventAudiences,
        eq(eventAudienceRelations.audienceId, eventAudiences.id),
      )
      .where(inArray(eventAudienceRelations.eventId, eventIds)),

    db
      .select()
      .from(eventCohosts)
      .where(inArray(eventCohosts.eventId, eventIds)),
  ]);

  // Group themes, audiences and cohosts by event ID
  const themesByEvent = allThemes.reduce(
    (acc, { eventId, theme }) => {
      if (!acc[eventId]) acc[eventId] = [];
      acc[eventId].push(theme);
      return acc;
    },
    {} as Record<string, EventTheme[]>,
  );

  const audiencesByEvent = allAudiences.reduce(
    (acc, { eventId, audience }) => {
      if (!acc[eventId]) acc[eventId] = [];
      acc[eventId].push(audience);
      return acc;
    },
    {} as Record<string, EventAudience[]>,
  );

  const cohostsByEvent = allCohosts.reduce(
    (acc, cohost) => {
      if (!acc[cohost.eventId]) acc[cohost.eventId] = [];
      acc[cohost.eventId].push(cohost);
      return acc;
    },
    {} as Record<string, EventCohost[]>,
  );

  // Combine everything
  const eventsWithDetails = adminEvents.map((event) => ({
    ...event,
    themes: themesByEvent[event.id] || [],
    audiences: audiencesByEvent[event.id] || [],
    cohosts: cohostsByEvent[event.id] || [],
  }));

  return {
    events: eventsWithDetails,
    total,
    totalPages,
    currentPage: page,
  };
};

export const approveEvent = async (eventId: string): Promise<void> => {
  await db
    .update(events)
    .set({
      state: 'waiting-luma-edit',
      approvedAt: new Date(),
      rejectedAt: null, // Clear rejected status if previously rejected
    })
    .where(eq(events.id, eventId));
};

export const rejectEvent = async (
  eventId: string,
  rejectionReason: string,
): Promise<void> => {
  await db
    .update(events)
    .set({
      state: 'rejected',
      rejectedAt: new Date(),
      rejectionReason,
      approvedAt: null, // Clear approved status if previously approved
      publishedAt: null, // Clear published status if previously published
    })
    .where(eq(events.id, eventId));
};

// Event creation queries
export type CreateEventData = {
  authorEmail: string;
  authorName: string;
  companyName: string;
  companyWebsite: string;
  authorPhoneNumber: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  commune: string;
  format: EventFormat;
  capacity: number;
  lumaLink: string | null;
  companyLogoUrl: string;
};

export type CreateCohostData = {
  eventId: string;
  companyName: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhoneNumber: string | null;
  primaryContactWebsite: string | null;
  primaryContactLinkedin: string | null;
};

export const createEvent = async (data: CreateEventData): Promise<Event> => {
  const [newEvent] = await db
    .insert(events)
    .values({
      authorEmail: data.authorEmail,
      authorName: data.authorName,
      companyName: data.companyName,
      companyWebsite: data.companyWebsite,
      authorPhoneNumber: data.authorPhoneNumber,
      title: data.title,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      commune: data.commune,
      format: data.format,
      capacity: data.capacity,
      lumaLink: data.lumaLink,
      companyLogoUrl: data.companyLogoUrl,
      // Luma integration fields will be populated by the separate Luma action
      lumaEventApiId: null,
      lumaEventUrl: null,
      lumaEventCreatedAt: null,
      // Status tracking
      submittedAt: new Date(),
    })
    .returning();

  return newEvent;
};

export const createEventCohosts = async (
  cohosts: CreateCohostData[],
): Promise<EventCohost[]> => {
  if (cohosts.length === 0) return [];

  return db.insert(eventCohosts).values(cohosts).returning();
};

export const createEventThemeRelations = async (
  eventId: string,
  themeIds: string[],
): Promise<void> => {
  if (themeIds.length === 0) return;

  await db.insert(eventThemeRelations).values(
    themeIds.map((themeId) => ({
      eventId,
      themeId,
    })),
  );
};

export const createEventAudienceRelations = async (
  eventId: string,
  audienceIds: string[],
): Promise<void> => {
  if (audienceIds.length === 0) return;

  await db.insert(eventAudienceRelations).values(
    audienceIds.map((audienceId) => ({
      eventId,
      audienceId,
    })),
  );
};

export type EventCountByDate = {
  date: string; // YYYY-MM-DD format
  count: number;
};

export type EventByHour = {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  companyName: string;
};

export const getEventsByHour = async (
  startDate: Date,
  endDate: Date,
): Promise<EventByHour[]> => {
  const result = await db
    .select({
      id: events.id,
      title: events.title,
      startDate: events.startDate,
      endDate: events.endDate,
      companyName: events.companyName,
    })
    .from(events)
    .where(
      and(
        sql`approved_at IS NOT NULL`,
        gte(events.startDate, startDate),
        lte(events.startDate, endDate),
      ),
    )
    .orderBy(events.startDate);

  return result;
};

export type EventCountByHour = {
  date: string; // YYYY-MM-DD format
  hour: number; // 0-23
  count: number;
};

export const getEventCountsByHour = async (
  startDate: Date,
  endDate: Date,
): Promise<EventCountByHour[]> => {
  // Format dates as ISO strings for the query
  const startDateStr = startDate.toISOString();
  const endDateStr = endDate.toISOString();

  // Use a more complex query that expands each event across all hours it occupies
  const result = await db.execute(sql`
    WITH RECURSIVE event_hours AS (
      -- Base case: get all events in range
      SELECT 
        id,
        start_date,
        end_date,
        DATE(start_date)::text as date,
        EXTRACT(HOUR FROM start_date)::integer as hour
      FROM "Events"
      WHERE state = 'published'
        AND start_date >= ${startDateStr}::timestamp
        AND start_date <= ${endDateStr}::timestamp
      
      UNION ALL
      
      -- Recursive case: generate next hour for each event
      SELECT 
        eh.id,
        eh.start_date,
        eh.end_date,
        DATE(eh.start_date + ((eh.hour + 1 - EXTRACT(HOUR FROM eh.start_date)) * INTERVAL '1 hour'))::text as date,
        (eh.hour + 1)::integer as hour
      FROM event_hours eh
      WHERE eh.start_date + ((eh.hour + 1 - EXTRACT(HOUR FROM eh.start_date)) * INTERVAL '1 hour') < eh.end_date
        AND eh.hour < 23  -- Prevent infinite recursion beyond day boundary
    )
    SELECT 
      date,
      hour,
      COUNT(*)::integer as count
    FROM event_hours
    WHERE hour >= 8 AND hour <= 20  -- Only show business hours (8 AM - 8 PM)
    GROUP BY date, hour
    ORDER BY date, hour
  `);

  // Convert the raw result to our expected format
  return (result as any[]).map((row: any) => ({
    date: row.date,
    hour: Number(row.hour),
    count: Number(row.count),
  }));
};
