"""SendGrid email service for ProAICV transactional emails."""
from __future__ import annotations
import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

_PRIMARY = "#4361EE"
_DARK = "#1a1a2e"
_MUTED = "#6b7280"
_BG = "#f9fafb"


def _dr(label: str, value: str) -> str:
    """Table-based detail row — compatible with all email clients including Gmail."""
    return (
        '<table width="100%" cellpadding="0" cellspacing="0" border="0" '
        'style="border-bottom:1px solid #f0f0f0">'
        '<tr>'
        f'<td style="font-size:14px;color:{_MUTED};padding:8px 0;white-space:nowrap;width:40%">{label}</td>'
        f'<td style="font-size:14px;padding:8px 0 8px 8px">{value}</td>'
        '</tr>'
        '</table>'
    )


def _wrap(title: str, body: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{title}</title>
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:{_BG};color:{_DARK};padding:24px}}
.wrap{{max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:40px 36px;box-shadow:0 2px 12px rgba(0,0,0,.06)}}
.logo{{font-size:24px;font-weight:800;color:{_PRIMARY};margin-bottom:24px}}
.logo span{{color:{_DARK}}}
h1{{font-size:22px;font-weight:700;margin-bottom:12px}}
p{{font-size:15px;line-height:1.65;color:#374151;margin-bottom:12px}}
.badge{{display:inline-block;padding:3px 10px;border-radius:20px;font-size:13px;font-weight:600;margin-bottom:16px}}
.badge-seeker{{background:#4361EE18;color:{_PRIMARY}}}
.badge-provider{{background:#2ec4b618;color:#2ec4b6}}
.divider{{height:1px;background:#f0f0f0;margin:20px 0}}
.otp{{font-size:36px;font-weight:800;letter-spacing:8px;color:{_PRIMARY};text-align:center;padding:24px;background:{_BG};border-radius:12px;margin:20px 0}}
.footer{{margin-top:32px;font-size:12px;color:{_MUTED};text-align:center;line-height:1.6}}
@media(max-width:600px){{.wrap{{padding:24px 18px}}}}
</style>
</head>
<body>
<div class="wrap">
  <div class="logo">ProAI<span>CV</span></div>
  {body}
  <div class="footer">
    &copy; 2026 KDAA ANALYTICS PRIVATE LIMITED<br/>
    🌐 <a href="https://kdaanalytics.com" style="color:{_MUTED}">kdaanalytics.com</a> &middot;
    ✉ <a href="mailto:info@kdaanalytics.com" style="color:{_MUTED}">info@kdaanalytics.com</a>
  </div>
</div>
</body>
</html>"""


async def _send(to_email: str, subject: str, html: str) -> None:
    """Send via SendGrid REST API. Never raises — logs failures silently."""
    if not settings.has_sendgrid_key:
        logger.info("SendGrid not configured — skipping email to %s: %s", to_email, subject)
        return
    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": settings.SENDGRID_FROM_EMAIL, "name": settings.SENDGRID_FROM_NAME},
        "subject": subject,
        "content": [{"type": "text/html", "value": html}],
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://api.sendgrid.com/v3/mail/send",
                json=payload,
                headers={"Authorization": f"Bearer {settings.SENDGRID_API_KEY}"},
            )
            if resp.status_code not in (200, 202):
                logger.error("SendGrid error %s for %s: %s", resp.status_code, to_email, resp.text)
            else:
                logger.info("Email sent to %s: %s", to_email, subject)
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, exc)


# ── 1. Welcome on registration ────────────────────────────────────────────────
async def send_welcome_email(to_email: str, name: str, role: str) -> None:
    display = name or "there"
    badge = (
        '<span class="badge badge-seeker">Job Seeker</span>'
        if role == "job_seeker"
        else '<span class="badge badge-provider">Job Provider</span>'
    )
    if role == "job_provider":
        bullets = "<li>Post job listings for admin review</li><li>Manage applicants from one dashboard</li><li>Get notified when your listing goes live</li>"
    else:
        bullets = "<li>Upload your resume &amp; get an ATS score</li><li>Discover AI-matched jobs daily</li><li>Generate cover letters &amp; prep for interviews</li>"
    body = f"""
<h1>Greetings from ProAICV, {display}! 🎉</h1>
{badge}
<p>Your account is ready. Here's what you can do right away:</p>
<ul style="padding-left:20px;margin-bottom:16px;font-size:15px;line-height:1.8;color:#374151">{bullets}</ul>
<p>You have <strong>7 days of full Pro access</strong> from today — explore every feature free.</p>
<div class="divider"></div>
<p style="color:{_MUTED};font-size:13px">If you didn't create this account, contact <a href="mailto:info@kdaanalytics.com">info@kdaanalytics.com</a>.</p>"""
    await _send(to_email, "Welcome to ProAICV — your account is ready", _wrap("Welcome", body))


# ── 2a. Job seeker: application submitted ─────────────────────────────────────
async def send_application_submitted_email(to_email: str, name: str, job_title: str, company: str) -> None:
    display = name or "there"
    body = f"""
<h1>Application submitted ✅</h1>
<span class="badge badge-seeker">Job Seeker</span>
<p>Hi {display}, your application has been recorded successfully.</p>
<div class="divider"></div>
{_dr("Role", f"<strong>{job_title}</strong>")}
{_dr("Company", company)}
<div class="divider"></div>
<p>Track all your applications in the <strong>Applications</strong> tab inside ProAICV.</p>"""
    await _send(to_email, f"Application submitted — {job_title} at {company}", _wrap("Application submitted", body))


# ── 2b. Job seeker: application status changed ────────────────────────────────
_STATUS_LABELS = {
    "screening": "You're in screening 📋",
    "interview": "Interview scheduled! 🗓",
    "offer": "You received an offer! 🎉",
    "rejected": "Application not selected",
    "withdrawn": "Application withdrawn",
}

async def send_application_status_email(
    to_email: str, name: str, job_title: str, company: str, new_status: str
) -> None:
    display = name or "there"
    label = _STATUS_LABELS.get(new_status, new_status.replace("_", " ").title())
    body = f"""
<h1>Application update: {label}</h1>
<span class="badge badge-seeker">Job Seeker</span>
<p>Hi {display}, the status of your application has been updated.</p>
<div class="divider"></div>
{_dr("Role", f"<strong>{job_title}</strong>")}
{_dr("Company", company)}
{_dr("New status", f"<strong>{label}</strong>")}
<div class="divider"></div>
<p>Open ProAICV to view full details and next steps.</p>"""
    await _send(to_email, f"Application update: {label} — {job_title}", _wrap("Application update", body))


# ── 3. Job provider: listing submitted for review ─────────────────────────────
async def send_listing_submitted_email(to_email: str, name: str, job_title: str, company: str) -> None:
    display = name or "there"
    body = f"""
<h1>Job listing submitted for review 📝</h1>
<span class="badge badge-provider">Job Provider</span>
<p>Hi {display}, your listing has been submitted and is now pending admin review.</p>
<div class="divider"></div>
{_dr("Title", f"<strong>{job_title}</strong>")}
{_dr("Company", company)}
{_dr("Status", "⏳ Pending Review")}
<div class="divider"></div>
<p>You'll receive another email once your listing is reviewed. This usually takes less than 24 hours.</p>"""
    await _send(to_email, f"Listing submitted for review — {job_title}", _wrap("Listing submitted", body))


# ── 4. Job provider: listing approved / rejected ──────────────────────────────
async def send_listing_decision_email(
    to_email: str, name: str, job_title: str, company: str, decision: str
) -> None:
    display = name or "there"
    if decision == "approved":
        status_line, headline = "✅ Live", "Your listing is now live! 🚀"
        note = "Job seekers can now discover and apply to your listing in the ProAICV app."
    else:
        status_line, headline = "❌ Rejected", "Your listing was not approved"
        note = ("Your listing did not meet our content guidelines. Please review and resubmit with accurate information. "
                "Contact <a href='mailto:info@kdaanalytics.com'>info@kdaanalytics.com</a> if you need help.")
    body = f"""
<h1>{headline}</h1>
<span class="badge badge-provider">Job Provider</span>
<p>Hi {display}, the admin has reviewed your job listing.</p>
<div class="divider"></div>
{_dr("Title", f"<strong>{job_title}</strong>")}
{_dr("Company", company)}
{_dr("Status", f"<strong>{status_line}</strong>")}
<div class="divider"></div>
<p>{note}</p>"""
    subject = f"Your listing is live — {job_title}" if decision == "approved" else f"Listing not approved — {job_title}"
    await _send(to_email, subject, _wrap("Listing decision", body))


# ── 5. Profile updated ────────────────────────────────────────────────────────
async def send_profile_updated_email(to_email: str, name: str) -> None:
    display = name or "there"
    body = f"""
<h1>Profile updated ✏️</h1>
<p>Hi {display}, your ProAICV profile was updated successfully.</p>
<p>If you didn't make this change, please contact us immediately at
<a href="mailto:info@kdaanalytics.com">info@kdaanalytics.com</a>.</p>"""
    await _send(to_email, "Your ProAICV profile was updated", _wrap("Profile updated", body))


# ── 6. Forgot password OTP ────────────────────────────────────────────────────
async def send_password_reset_otp_email(to_email: str, name: str, otp: str) -> None:
    display = name or "there"
    body = f"""
<h1>Reset your password 🔐</h1>
<p>Hi {display}, use the code below to reset your ProAICV password.
The code expires in <strong>15 minutes</strong>.</p>
<div class="otp">{otp}</div>
<p>Enter this code in the app when prompted. Do <strong>not</strong> share it with anyone.</p>
<div class="divider"></div>
<p style="color:{_MUTED};font-size:13px">If you didn't request a password reset, you can safely ignore this email.</p>"""
    await _send(to_email, "Your ProAICV password reset code", _wrap("Reset password", body))


# ── Trial ending reminder ─────────────────────────────────────────────────────
async def send_trial_ending_email(to_email: str, name: str) -> None:
    display = name or "there"
    body = f"""
<h1>Your free trial ends today ⏰</h1>
<p>Hi {display}, your 7-day free trial of ProAICV is coming to an end.</p>
<p>Upgrade to <strong>Pro</strong> to keep access to:</p>
<ul style="padding-left:20px;margin-bottom:16px;font-size:15px;line-height:1.8;color:#374151">
  <li>Unlimited AI Career Coach chats</li>
  <li>Unlimited interview prep &amp; cover letters</li>
  <li>Up to 5 resume uploads</li>
  <li>Unlimited application tracking</li>
</ul>
<p>Only <strong>&#8377;199/month</strong> — cancel anytime.</p>
<div class="divider"></div>
<p style="color:{_MUTED};font-size:13px">Open ProAICV and tap <em>Upgrade</em> to continue without interruption.</p>"""
    await _send(to_email, "Your ProAICV free trial ends today — upgrade to Pro", _wrap("Trial ending", body))


# ── Phone verification OTP ────────────────────────────────────────────────────
async def send_weekly_digest_email(
    to_email: str, name: str,
    applied: int, interview: int, offer: int, rejected: int, total_jobs: int,
) -> None:
    display = name or "there"
    total_apps = applied + interview + offer + rejected
    body = f"""
<h1>Your weekly career summary 📊</h1>
<p>Hi {display}, here's a quick look at how your job search is going this week.</p>
<div class="divider"></div>
{_dr("Total applications", str(total_apps))}
{_dr("Applied", str(applied))}
{_dr("Interview stage", str(interview))}
{_dr("Offers", str(offer))}
{_dr("Rejected", str(rejected))}
{_dr("Jobs available on ProAICV", str(total_jobs))}
<div class="divider"></div>
<p>{'🎉 You have an interview coming up — prepare your STAR stories and research the company!' if interview > 0 else 'Keep applying! Consistency is the key to landing your next role.'}</p>
<p style="color:{_MUTED};font-size:13px">Open the app to track your applications and discover new matches.</p>"""
    await _send(to_email, "Your weekly ProAICV career summary", _wrap("Weekly digest", body))


async def send_career_tip_email(to_email: str, name: str, tip_subject: str, tip_body: str) -> None:
    display = name or "there"
    body = f"""
<h1>{tip_subject} 💡</h1>
<p>Hi {display}, here's your fortnightly career tip from ProAICV.</p>
<div class="divider"></div>
{tip_body}
<div class="divider"></div>
<p style="color:{_MUTED};font-size:13px">Open ProAICV to apply these tips to your resume and job search.</p>"""
    await _send(to_email, f"Career tip: {tip_subject}", _wrap("Career tip", body))


async def send_data_export_email(to_email: str, name: str, rows: list[tuple[str, str]]) -> None:
    display = name or "there"
    table_rows = "".join(_dr(label, value) for label, value in rows)
    body = f"""
<h1>Your ProAICV data export 📦</h1>
<p>Hi {display}, here is a copy of the data we hold for your account.
If anything looks wrong, please contact us at <a href="mailto:info@kdaanalytics.com">info@kdaanalytics.com</a>.</p>
<div class="divider"></div>
{table_rows}
<div class="divider"></div>
<p style="color:{_MUTED};font-size:13px">To delete your account and all data, use the Delete Account option in Settings.</p>"""
    await _send(to_email, "Your ProAICV data export", _wrap("Data export", body))


async def send_bulk_upload_email(
    to_email: str, name: str,
    submitted: int, success_count: int,
    errors: list[dict],
) -> None:
    display = name or "there"
    error_html = ""
    if errors:
        shown = errors[:20]
        items = "".join(
            f'<li style="margin-bottom:4px"><strong>Row {e["row"]}:</strong> {e["message"]}</li>'
            for e in shown
        )
        more = f"<li style='color:{_MUTED}'>…and {len(errors) - 20} more errors</li>" if len(errors) > 20 else ""
        error_html = f"""
<div class="divider"></div>
<p style="color:#B45309;font-weight:600">⚠️ {len(errors)} row{'s' if len(errors) != 1 else ''} had errors and were skipped:</p>
<ul style="padding-left:20px;margin:8px 0;font-size:13px;color:#374151">{items}{more}</ul>"""

    body = f"""
<h1>Bulk Job Upload {'Complete' if success_count > 0 else 'Failed'} 📋</h1>
<span class="badge badge-provider">Job Provider</span>
<p>Hi {display}, here is the result of your bulk job upload.</p>
<div class="divider"></div>
{_dr("Rows in file", str(submitted))}
{_dr("Queued for review", f"<strong style='color:#2ec4b6'>{success_count}</strong>")}
{_dr("Skipped (errors)", str(len(errors)))}
{_dr("Status", "⏳ Pending Admin Review" if success_count > 0 else "❌ Nothing submitted")}
{error_html}
<div class="divider"></div>
{'<p>Each job will go live after admin approval. You will receive a separate email per listing decision.</p>' if success_count > 0 else '<p>Please fix the errors in your file and try uploading again. Use the sample template as a guide.</p>'}"""

    subject = (
        f"Bulk upload: {success_count} job{'s' if success_count != 1 else ''} queued for review"
        if success_count > 0
        else "Bulk upload failed — no jobs submitted"
    )
    await _send(to_email, subject, _wrap("Bulk upload", body))


async def send_phone_otp_email(to_email: str, name: str, otp: str, phone: str) -> None:
    display = name or "there"
    body = f"""
<h1>Verify your mobile number 📱</h1>
<p>Hi {display}, use the code below to verify your mobile number <strong>{phone}</strong> on ProAICV.
The code expires in <strong>15 minutes</strong>.</p>
<div class="otp">{otp}</div>
<p>Enter this code in the app when prompted. Do <strong>not</strong> share it with anyone.</p>
<div class="divider"></div>
<p style="color:{_MUTED};font-size:13px">If you didn't request this, you can safely ignore this email.</p>"""
    await _send(to_email, f"ProAICV verification code: {otp}", _wrap("Verify mobile", body))
