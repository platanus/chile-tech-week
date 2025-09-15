# CLAUDE.md - Platanus Hackathon

## Project Context

Platanus is a LATAM startup accelerator. Platanus organizes a yearly hackathon, the best hacking event in latam, with top technical talent in latam. This project covers all the software that will be used in the hackathon.

## Development Commands

```bash
# Development
pnpm dev                    # Start dev server with Overmind (detached)
pnpm dev:attach            # Attach to running dev server
pnpm dev:kill              # Stop dev server
pnpm dev:logs              # View dev server logs (default: 100 lines)
pnpm dev:logs 50           # View dev server logs (custom line count)
pnpm dev:main              # Run dev main script

# Code Quality
pnpm typecheck             # TypeScript type checking
pnpm lint                  # Next.js + Biome linting
pnpm lint:fix              # Auto-fix linting issues
pnpm format                # Format code with Biome

# Database Operations
pnpm db:generate           # Generate Drizzle schema
pnpm db:migrate           # Run database migrations
pnpm db:generate:migrate  # Generate schema + migrate
pnpm db:reset             # Reset database
pnpm db:reset:migrate     # Reset database + migrate
pnpm db:studio            # Open Drizzle Studio
pnpm db:psql              # Connect to PostgreSQL

# Testing & Build
pnpm test                 # Run Playwright tests
pnpm gen-route-types      # Generate type-safe route types
```

## Development Playground

- If you need to run one-off actions, you can create files inside src/lib/dev and run them directly with node.

### File Organization

**Rule**: Everything related to only one page/layout goes in `app/`, everything reusable goes in `src/`

```
app/
├── (auth)/                    # Authentication route group
│   ├── login/
│   │   ├── login-form.tsx     # Page-specific component
│   │   ├── login.action.ts    # Page-specific server action
│   │   └── page.tsx
│   └── register/
│       ├── register-form.tsx
│       ├── register.action.ts
│       └── page.tsx
├── (hack)/                    # Main app route group
│   ├── teams/
│   │   ├── _components/       # Multiple components (underscore = ignored by routing)
│   │   │   ├── team-card.tsx
│   │   │   ├── team-stats.tsx
│   │   │   └── team-table.tsx
│   │   ├── _actions/          # Multiple actions
│   │   │   ├── team-crud.action.ts
│   │   │   └── team-stats.action.ts
│   │   ├── [slug]/
│   │   │   ├── edit-team-form.tsx
│   │   │   ├── edit-team.action.ts
│   │   │   └── page.tsx
│   │   └── page.tsx
│   └── actions.ts             # Route group level actions
├── layout.tsx
└── globals.css

src/
├── components/                # Reusable across the app
│   ├── ui/                   # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── form.tsx
│   ├── utils/                # Utility components
│   │   └── error-boundary.tsx
│   └── icons.tsx             # App-wide icons
├── features/                 # Grouped functionality (new!)
│   ├── auth/                 # Authentication feature
│   │   ├── auth-form.tsx
│   │   ├── auth.action.ts
│   │   └── auth.schema.ts
│   ├── submissions/          # Project submissions feature
│   │   ├── submission-form.tsx
│   │   ├── submission.action.ts
│   │   └── submission.schema.ts
│   └── judging/              # Judging feature
│       ├── scoring.tsx
│       ├── scoring.action.ts
│       └── scoring.schema.ts
├── lib/                      # External library configurations
│   ├── db/                   # Database related
│   │   ├── schema.ts
│   │   └── index.ts
│   ├── auth/                 # Auth configuration
│   ├── schemas/              # Zod schemas for forms
│   │   ├── teams.schema.ts
│   │   ├── projects.schema.ts
│   │   └── users.schema.ts
│   ├── utils/                # Utility functions
│   │   ├── forms.ts          # Form utilities
│   │   └── server-actions.ts # Server action utilities
│   ├── utils.ts              # cn() and other utilities
│   └── constants.ts
├── hooks/                    # Custom React hooks
│   ├── use-current-user.ts
│   ├── use-form-action.ts
│   └── use-mobile.tsx
└── queries/                  # Data fetching logic
    ├── teams.ts
    ├── projects.ts
    └── users.ts
```

**Naming Conventions:**

- `.action.ts` - Server actions
- `.test.ts` - Test files
- `_folder/` - Ignored by Next.js routing (for organization)

### Database & State

- Use Drizzle ORM with PostgreSQL
- Define schemas in `src/lib/db/schema.ts`
- Keep queries in `src/queries/` directory
- To modify the local schema, edit `src/lib/db/schema.ts` and then run `pnpm db:generate:migrate`
- When doing data input, make sure to setup the corresponding zod schema in `src/lib/schemas/` directory.
- Use Server Actions for mutations

### UI

- We use shadcn for our base components.
- We use tailwind v4. Remember to use gap- instead of space-
- If a shadcn component is not installed, use `pnpm dlx shadcn@latest add X`
- We use custom color classes from app/globals.css, that allows us to create themes
- When adding a button or component that uses a server action, handle changing states using `useActionState`.
- Use `cn()` for combining conditional classes
- When doing complex state mutations in frontend or infinite scrolling for example, use `swr`
- Avoid using deprectad tailwind classes like space-\*, use their flex alternatives.

### Form Action Convention

**IMPORTANT**: Use type-safe forms with React Hook Form + Zod validation for client-side UX and server actions for mutations.

**1. Schema Definition (`src/lib/schemas/teams.schema.ts`)**

```typescript
import { z } from "zod";
import { team } from "@/src/lib/db/schema";
import type { FormDataFor } from "@/src/lib/types";

// Form schema ensures compatibility with database insert requirements
export const createTeamFormSchema = z.object({
  name: z
    .string()
    .min(1, "Team name is required")
    .max(255, "Team name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  maxMembers: z
    .number()
    .int("Max members must be a whole number")
    .min(1, "Team must have at least 1 member")
    .max(10, "Team cannot have more than 10 members")
    .default(4),
}) satisfies z.ZodSchema<FormDataFor<typeof team>>;

export type CreateTeamFormData = z.infer<typeof createTeamFormSchema>;
```

**2. Server Action (`_actions/create-team.action.ts`)**

```typescript
"use server";

import { redirect } from "next/navigation";
import { onlyAuthenticated } from "@/src/lib/auth/server";
import {
  isCommonError,
  handleCommonError,
  type FormActionState,
} from "@/src/lib/utils/forms";
import { revalidatePath } from "next/cache";
import { createTeam } from "@/src/queries/teams";
import {
  createTeamFormSchema,
  type CreateTeamFormData,
} from "@/src/lib/schemas/teams.schema";

export async function createTeamAction(
  data: CreateTeamFormData
): Promise<FormActionState<CreateTeamFormData>> {
  try {
    // Check authorization - any authenticated user can create a team
    const currentUser = await onlyAuthenticated();

    // Validate data
    const validatedData = createTeamFormSchema.parse(data);

    // Create team in database with current user as leader
    const newTeam = await createTeam({
      ...validatedData,
      leaderId: currentUser.id,
    });

    // Revalidate related pages
    revalidatePath("/teams");
    revalidatePath(`/teams/${newTeam.slug}`);

    // Return success with redirect URL for client-side navigation
    return {
      success: true,
      data: validatedData,
      message: "Team created successfully!",
      redirectTo: `/teams/${newTeam.slug}`,
    };
  } catch (error) {
    // Handle common error types (Zod validation + database constraints)
    if (isCommonError(error)) {
      return handleCommonError<CreateTeamFormData>(error);
    }

    // Handle other error types
    console.error("Create team error:", error);
    return {
      success: false,
      globalError:
        error instanceof Error
          ? error.message
          : "Failed to create team. Please try again.",
    };
  }
}
```

**3. Client Form Component (`page.tsx`)**

```typescript
"use client";

import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import { useFormAction } from "@/src/hooks/use-form-action";
import { createTeamAction } from "./create-team.action";
import {
  createTeamFormSchema,
  type CreateTeamFormData,
} from "@/src/lib/schemas/teams.schema";
import Link from "next/link";

export default function NewTeamPage() {
  const { form, handleSubmit, serverState, isPending } =
    useFormAction<CreateTeamFormData>({
      schema: createTeamFormSchema,
      action: createTeamAction,
      defaultValues: {
        name: "",
        description: "",
        maxMembers: 4,
      },
      onSuccess: () => {
        // The server action handles redirect, but we can add additional logic here if needed
      },
    });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold hacking-tight">Create New Team</h1>
        <p className="text-muted-foreground">Form a team for the hackathon.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Details</CardTitle>
          <CardDescription>
            Enter the basic information for your hackathon team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Code Ninjas"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Brief description of your team"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxMembers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Team Members</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        disabled={isPending}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Global Error */}
              {serverState.globalError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-red-600 text-sm">
                    {serverState.globalError}
                  </p>
                </div>
              )}

              {/* Success Message */}
              {serverState.success && serverState.message && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <p className="text-green-600 text-sm">
                    {serverState.message}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={isPending || !form.formState.isValid}
                >
                  {isPending ? "Creating..." : "Create Team"}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/teams">Cancel</Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Key Principles:**

- **Use `useFormAction` hook** for client-side forms with React Hook Form + server actions
- **Schema definition in separate files** at `src/lib/schemas/` instead of inside query files
- **Use shadcn Form components** (`Form`, `FormField`, `FormControl`, `FormItem`, `FormLabel`, `FormMessage`) for consistent UI
- **Schema with `satisfies` pattern** ensures database compatibility via `FormDataFor<T>`
- **Common error handling** with `isCommonError` and `handleCommonError` utilities from `@/src/lib/utils/forms`
- **Type-safe server actions** return `FormActionState<T>` with proper error types
- **Client-side validation** with Zod resolver provides immediate feedback
- **Server errors sync automatically** to form fields via the `useFormAction` hook
- **Use `useTransition`** for loading states instead of `useActionState`
- **Always check authorization** in server actions using `await onlyAuthenticated()` or role-specific checks
- **Use native `revalidatePath()`** from `next/cache` instead of custom `revalidatePaths()` utility
- **Return success state with redirect URL** for client-side navigation instead of using `redirect()` directly

### Code Quality

- **Linting**: Biome + ESLint with Next.js config
- **Formatting**: Biome (replaces Prettier)
- **TypeScript**: Strict mode enabled
- Avoid writing comments unless absolutely necessary
- Be suspicious if you are writing an interface, most should be derived from src/lib/db/schema unless props

### Authentication & Authorization

- Next Auth v5 with custom providers
- Role-based access control via `use-authorization` hook
- Protect routes with middleware
- Session handling with React context

### Type-Safe Routes

We use `next-typesafe-url` for compile-time route validation and type safety.

**Static Routes** (no parameters):

```typescript
import { $path } from "next-typesafe-url";

// Simple static route
const url = $path({ route: "/teams" });
// Usage in Link component
<Link href={$path({ route: "/projects/submit" })}>Submit Project</Link>;
```

**Dynamic Routes** (with parameters):

```typescript
import { $path } from "next-typesafe-url";

// Route with parameters
const url = $path({
  route: "/teams/[slug]/projects/[projectId]/submissions",
  routeParams: {
    slug: "team-name",
    projectId: "project-123",
  },
});
```

**Route Type Definition** (for dynamic routes):
Create `routeType.ts` in the route directory:

```typescript
import type { DynamicRoute } from "next-typesafe-url";
import { z } from "zod";

const Route = {
  routeParams: z.object({
    slug: z.string().min(1, "Team slug is required"),
    projectId: z.string().min(1, "Project ID is required"),
  }),
} satisfies DynamicRoute;

export type RouteType = typeof Route;
export default Route;
```

**Commands:**

- Run `pnpm gen-route-types` after adding new dynamic routes
- Generated types are in `_next-typesafe-url_.d.ts` (auto-generated, don't edit)

### Other

- We are using NextJS 15, so remember that params should be awaited
