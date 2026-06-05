import "dotenv/config";
import { randomUUID } from "node:crypto";
import { and, eq, gte, lte } from "drizzle-orm";
import { generateText, Output } from "ai";
import z from "zod";
import { db } from "@/lib/db/index.js";
import {
	appUsers,
	type AppUser,
} from "@/features/app-users/app-users.table.js";
import { entries } from "@/features/entries/entries.table.js";
import { entriesService } from "@/features/entries/entries.service.js";
import { memoriesPipelineService } from "@/features/memories/memory-pipeline.service.js";
import { closeRabbitMq, isRabbitMqEnabled } from "@/lib/queue/rabbitmq.js";
import { MEMORY_JOB_VERSION } from "@/lib/queue/memory-queue.js";

/**
 * Generate onboarding-aware journal entries for an existing app user.
 *
 * Usage:
 * - Generate entries:
 *   pnpm run script:generate-entries -- --email you@example.com --start 2026-03-01 --end 2026-03-10 --run true
 *
 * - Dry run (verify user + print how many entries would be created/updated/skipped):
 *   pnpm run script:generate-entries -- --email you@example.com --start 2026-03-01 --end 2026-03-13
 *
 * User selector (one required):
 * - --email <email>
 * - --user-id <app_user_id>
 * - --auth-id <better_auth_user_id>
 *
 * Required:
 * - --start <YYYY-MM-DD>
 * - --end <YYYY-MM-DD>
 *
 * Optional:
 * - --overwrite <true|false>      Overwrite non-empty entries (default: false)
 * - --run <true|false>            Execute writes (default: false)
 * - --dry-run <true|false>        Compatibility alias; inverse of --run
 * - --inline-memory <true|false>  Process memory extraction inline after save
 */
type ArgMap = Record<string, string | boolean>;

function hasAiGatewayKey(): boolean {
	return Boolean(process.env.AI_GATEWAY_API_KEY?.trim());
}

function parseArgs(argv: string[]): ArgMap {
	const args: ArgMap = {};

	for (let i = 0; i < argv.length; i += 1) {
		const token = argv[i];
		if (!token.startsWith("--")) continue;

		const [rawKey, inlineValue] = token.slice(2).split("=");
		const key = rawKey.trim();
		if (!key) continue;

		if (inlineValue !== undefined) {
			args[key] = inlineValue;
			continue;
		}

		const nextToken = argv[i + 1];
		if (!nextToken || nextToken.startsWith("--")) {
			args[key] = true;
			continue;
		}

		args[key] = nextToken;
		i += 1;
	}

	return args;
}

function parseIsoDate(value: string, label: string): Date {
	const parsed = new Date(`${value}T00:00:00.000Z`);
	if (Number.isNaN(parsed.getTime())) {
		throw new Error(`Invalid ${label} date "${value}". Use YYYY-MM-DD.`);
	}
	return parsed;
}

function formatDateIso(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function iterateDatesInclusive(start: Date, end: Date): Date[] {
	const dates: Date[] = [];
	const cursor = new Date(start);
	while (cursor <= end) {
		dates.push(new Date(cursor));
		cursor.setUTCDate(cursor.getUTCDate() + 1);
	}
	return dates;
}

function formatList(items?: string[] | null): string {
	if (!items || items.length === 0) return "Not provided";
	return items.join(", ");
}

function parseBoolean(
	value: string | boolean | undefined,
	fallback: boolean,
): boolean {
	if (typeof value === "boolean") return value;
	if (typeof value !== "string") return fallback;
	const normalized = value.trim().toLowerCase();
	if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
	if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
	return fallback;
}

function buildOnboardingContext(user: AppUser): string {
	return [
		`Name: ${user.fullName ?? "Not provided"}`,
		`Current role: ${user.currentRole ?? "Not provided"}`,
		`Experience level: ${user.experienceLevel ?? "Not provided"}`,
		`Mentorship style: ${user.mentorshipStyle ?? "Not provided"}`,
		`Development goals: ${formatList(user.developmentGoals)}`,
		`Tech stack: ${formatList(user.techStack)}`,
		`Work environment: ${user.workEnvironment ?? "Not provided"}`,
		`Journaling frequency: ${user.journalingFrequency ?? "Not provided"}`,
		`Preferred journaling time: ${user.journalingTime ?? "Not provided"}`,
	].join("\n");
}

function fallbackEntryText(user: AppUser, entryDate: Date): string {
	const iso = formatDateIso(entryDate);
	const goals = user.developmentGoals?.slice(0, 2) ?? [];
	const focusGoal = goals[0] ?? "Improve engineering impact";
	const supportGoal = goals[1] ?? "Build consistent learning habits";
	const role = user.currentRole ?? "developer";
	const level = user.experienceLevel ?? "engineer";
	const stack = formatList(user.techStack);

	return [
		`Date: ${iso}`,
		`I worked as a ${role} (${level}) and focused on ${focusGoal}. I made measurable progress by writing code, validating assumptions, and noting tradeoffs against long-term maintainability.`,
		`I used ${stack} today. I also spent time on ${supportGoal} by documenting decisions and identifying the next action that will unblock momentum tomorrow.`,
		`goal: Advance ${focusGoal} with one concrete deliverable this week`,
		`project: Build better daily execution in my ${role} workflow`,
		`learning: Practice deliberate reflection and tighter feedback loops`,
	].join("\n\n");
}

const generatedEntrySchema = z.object({
	plainText: z.string().min(120).max(5000),
});

async function generateAiEntry({
	user,
	entryDate,
	rangeStart,
	rangeEnd,
}: {
	user: AppUser;
	entryDate: Date;
	rangeStart: Date;
	rangeEnd: Date;
}): Promise<string> {
	const onboardingContext = buildOnboardingContext(user);
	const isoDate = formatDateIso(entryDate);
	const dayIndex =
		Math.floor(
			(entryDate.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000),
		) + 1;
	const totalDays =
		Math.floor(
			(rangeEnd.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000),
		) + 1;

	const prompt = [
		"Generate a realistic developer journal entry.",
		"Write in first person, concrete, and specific. Avoid fluff.",
		`Entry date: ${isoDate} (${dayIndex}/${totalDays} in this generation window).`,
		"",
		"User onboarding context:",
		onboardingContext,
		"",
		"Requirements:",
		"- 3 to 5 short paragraphs, 180-450 words total.",
		"- Reflect progress, blockers, and next step tied to the user goals/level/role.",
		"- Mention one concrete technical detail from the tech stack when possible.",
		"- End with 3-4 explicit memory lines for extraction, one per line.",
		"- Memory line format must be exactly: category: fact",
		"- Use only these categories: goal, project, milestone, blocker, win, learning, skill_growth, preference, habit, relationship, value, other",
		"",
		'Return JSON only: { "plainText": "..." }',
	].join("\n");

	const { text } = await generateText({
		model: "openai/gpt-4o-mini",
		output: Output.object({
			schema: generatedEntrySchema,
		}),
		prompt,
	});

	const parsed = JSON.parse(text) as z.infer<typeof generatedEntrySchema>;
	return parsed.plainText.trim();
}

function toMarkdown(plainText: string): string {
	return plainText.trim();
}

async function resolveUser(args: ArgMap): Promise<AppUser> {
	const userId =
		typeof args["user-id"] === "string" ? args["user-id"] : undefined;
	const authId =
		typeof args["auth-id"] === "string" ? args["auth-id"] : undefined;
	const email = typeof args.email === "string" ? args.email : undefined;

	if (!userId && !authId && !email) {
		throw new Error("Provide one of: --user-id, --auth-id, or --email.");
	}

	if (userId) {
		const [found] = await db
			.select()
			.from(appUsers)
			.where(eq(appUsers.id, userId))
			.limit(1);
		if (!found) throw new Error(`No app user found for --user-id ${userId}`);
		return found;
	}

	if (authId) {
		const [found] = await db
			.select()
			.from(appUsers)
			.where(eq(appUsers.authId, authId))
			.limit(1);
		if (!found) throw new Error(`No app user found for --auth-id ${authId}`);
		return found;
	}

	const [foundByAppEmail] = await db
		.select()
		.from(appUsers)
		.where(eq(appUsers.email, email as string))
		.limit(1);
	if (foundByAppEmail) return foundByAppEmail;

	throw new Error(`No app user found for --email ${email}`);
}

async function maybeProcessMemoryInline({
	userId,
	entryId,
	entryUpdatedAt,
	enabled,
}: {
	userId: string;
	entryId: string;
	entryUpdatedAt: string;
	enabled: boolean;
}) {
	if (!enabled) return;

	await memoriesPipelineService.processEntryChangedJob({
		payload: {
			jobVersion: MEMORY_JOB_VERSION,
			jobId: randomUUID(),
			userId,
			entryId,
			entryUpdatedAt,
		},
	});
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help || args.h) {
		console.log(
			[
				"Generate AI journal entries for a user across a date range.",
				"",
				"Usage:",
				"  pnpm run script:generate-entries -- --email you@example.com --start 2026-03-01 --end 2026-03-10 --run true",
				"",
				"User selectors (one required):",
				"  --user-id <app_user_id>",
				"  --auth-id <better_auth_user_id>",
				"  --email <email>",
				"",
				"Required:",
				"  --start <YYYY-MM-DD>",
				"  --end <YYYY-MM-DD>",
				"",
				"Optional:",
				"  --overwrite <true|false>       Default: false",
				"  --run <true|false>             Default: false (must be true to write entries)",
				"  --dry-run <true|false>         Compatibility alias; inverse of --run",
				"  --inline-memory <true|false>   Default: true when RabbitMQ disabled, false otherwise",
			].join("\n"),
		);
		return;
	}

	const startArg = typeof args.start === "string" ? args.start : undefined;
	const endArg = typeof args.end === "string" ? args.end : undefined;
	if (!startArg || !endArg) {
		throw new Error("Missing required flags: --start and --end (YYYY-MM-DD).");
	}

	const start = parseIsoDate(startArg, "start");
	const end = parseIsoDate(endArg, "end");
	if (start > end) throw new Error("--start must be before or equal to --end.");

	const user = await resolveUser(args);
	const overwrite = parseBoolean(args.overwrite, false);
	const hasRunFlag = args.run !== undefined;
	const hasDryRunFlag = args["dry-run"] !== undefined;
	if (hasRunFlag && hasDryRunFlag) {
		throw new Error("Use either --run or --dry-run, not both.");
	}
	const shouldRun = hasRunFlag
		? parseBoolean(args.run, false)
		: !parseBoolean(args["dry-run"], true);
	const dryRun = !shouldRun;
	const inlineMemoryDefault = !isRabbitMqEnabled();
	const inlineMemory = parseBoolean(args["inline-memory"], inlineMemoryDefault);
	const canUseAiGateway = hasAiGatewayKey();

	const dates = iterateDatesInclusive(start, end);
	let createdOrTouched = 0;
	let updated = 0;
	let skipped = 0;
	let aiFailures = 0;

	console.log(
		[
			`Generating entries for user ${user.id} (${user.email ?? "no-email"})`,
			`Date range: ${formatDateIso(start)} -> ${formatDateIso(end)} (${dates.length} days)`,
			`Options: overwrite=${overwrite} run=${shouldRun} dryRun=${dryRun} inlineMemory=${inlineMemory} aiGateway=${canUseAiGateway}`,
		].join("\n"),
	);

	if (dryRun) {
		const existingEntries = await db
			.select({
				id: entries.id,
				entryDate: entries.entryDate,
				plainText: entries.plainText,
			})
			.from(entries)
			.where(
				and(
					eq(entries.userId, user.id),
					gte(entries.entryDate, start),
					lte(entries.entryDate, end),
				),
			);

		const existingByDate = new Map<string, (typeof existingEntries)[number]>();
		for (const entry of existingEntries)
			existingByDate.set(formatDateIso(entry.entryDate), entry);

		const wouldCreate = dates.filter(
			(date) => !existingByDate.has(formatDateIso(date)),
		).length;
		const existingNonEmpty = existingEntries.filter(
			(entry) => (entry.plainText ?? "").trim().length > 0,
		).length;
		const existingEmpty = existingEntries.length - existingNonEmpty;
		const wouldUpdate = overwrite ? existingEntries.length : existingEmpty;
		const wouldSkip = overwrite ? 0 : existingNonEmpty;

		console.log("\nDry run summary (no writes performed):");
		console.log(
			`Verified user exists: ${user.id} (${user.email ?? "no-email"})`,
		);
		console.log(`Days in range: ${dates.length}`);
		console.log(`Entries already present in range: ${existingEntries.length}`);
		console.log(`Entries that would be created: ${wouldCreate}`);
		console.log(`Entries that would be updated: ${wouldUpdate}`);
		console.log(`Entries that would be skipped: ${wouldSkip}`);
		return;
	}

	for (const date of dates) {
		const entry = await entriesService.createOrGetByDate({
			userId: user.id,
			entryDate: date,
		});
		createdOrTouched += 1;

		if (!overwrite && (entry.plainText ?? "").trim().length > 0) {
			skipped += 1;
			console.log(
				`[${formatDateIso(date)}] Skipped existing non-empty entry ${entry.id}`,
			);
			continue;
		}

		let plainText: string;
		if (!canUseAiGateway) {
			aiFailures += 1;
			console.warn(`[${formatDateIso(date)}] AI_GATEWAY_API_KEY missing, using fallback template.`);
			plainText = fallbackEntryText(user, date);
		} else {
			try {
				plainText = await generateAiEntry({
					user,
					entryDate: date,
					rangeStart: start,
					rangeEnd: end,
				});
			} catch (error) {
				aiFailures += 1;
				console.warn(
					`[${formatDateIso(date)}] AI generation failed, using fallback template:`,
					error instanceof Error ? error.message : String(error),
				);
				plainText = fallbackEntryText(user, date);
			}
		}

		const content = toMarkdown(plainText);
		const saved = await entriesService.update({
			id: entry.id,
			userId: user.id,
			data: {
				plainText,
				content,
			},
		});

		await maybeProcessMemoryInline({
			userId: user.id,
			entryId: saved.id,
			entryUpdatedAt: saved.updatedAt.toISOString(),
			enabled: inlineMemory,
		});

		updated += 1;
		console.log(`[${formatDateIso(date)}] Updated entry ${saved.id}`);
	}

	console.log("\nDone.");
	console.log(
		`Touched ${createdOrTouched} entries, updated ${updated}, skipped ${skipped}, AI fallbacks ${aiFailures}.`,
	);
}

void (async () => {
	try {
		await main();
	} catch (error: unknown) {
		console.error("Entry generation failed.");
		if (error instanceof Error) {
			console.error(error.message);
		} else {
			console.error(String(error));
		}
		process.exitCode = 1;
	} finally {
		await closeRabbitMq().catch(() => undefined);
	}
})();
