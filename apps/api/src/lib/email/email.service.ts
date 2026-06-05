import { Resend } from "resend";
import { env } from "@/config/env.js";

const defaultFrom = "JuneBug <onboarding@resend.dev>";

function getResendClient(): Resend | null {
	if (!env.RESEND_API_KEY) return null;
	return new Resend(env.RESEND_API_KEY);
}

export async function sendEmail(params: {
	to: string;
	subject: string;
	html: string;
	text?: string;
}): Promise<{ sent: boolean }> {
	const resend = getResendClient();
	if (!resend) {
		console.warn(
			`[email] RESEND_API_KEY not set — would send "${params.subject}" to ${params.to}`,
		);
		if (params.text) console.warn(`[email] ${params.text}`);
		return { sent: false };
	}

	const from = env.EMAIL_FROM ?? defaultFrom;
	console.log("from", from);
	const { error } = await resend.emails.send({
		from,
		to: params.to,
		subject: params.subject,
		html: params.html,
		text: params.text,
	});

	if (error) {
		console.error("[email] Failed to send:", error);
		throw new Error(error.message);
	}

	return { sent: true };
}

export async function sendPasswordResetEmail(params: {
	to: string;
	url: string;
}): Promise<void> {
	const text = `Reset your JuneBug password by opening this link:\n\n${params.url}\n\nIf you did not request this, you can ignore this email.`;
	const html = `
    <p>Reset your JuneBug password by clicking the link below:</p>
    <p><a href="${params.url}">Reset password</a></p>
    <p>If you did not request this, you can safely ignore this email.</p>
  `.trim();

	await sendEmail({
		to: params.to,
		subject: "Reset your password",
		html,
		text,
	});
}
