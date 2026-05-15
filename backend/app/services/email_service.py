import httpx
from app.config import settings


async def _send_via_sendgrid(to_email: str, to_name: str, subject: str, html_body: str) -> bool:
    if not settings.has_sendgrid_key:
        return False

    payload = {
        "personalizations": [{"to": [{"email": to_email, "name": to_name}]}],
        "from": {"email": settings.SENDGRID_FROM_EMAIL, "name": settings.SENDGRID_FROM_NAME},
        "subject": subject,
        "content": [{"type": "text/html", "value": html_body}],
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://api.sendgrid.com/v3/mail/send",
                json=payload,
                headers={
                    "Authorization": f"Bearer {settings.SENDGRID_API_KEY}",
                    "Content-Type": "application/json",
                },
            )
            return resp.status_code in (200, 202)
    except Exception:
        return False


async def send_welcome_email(email: str, name: str) -> None:
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#6366f1">Welcome to CVPilot, {name}!</h2>
      <p>Your AI-powered career coach is ready. Here's what you can do:</p>
      <ul>
        <li><strong>Upload your resume</strong> — get an instant ATS score and improvement tips</li>
        <li><strong>Browse jobs</strong> — see your match score for every listing</li>
        <li><strong>Use AI tools</strong> — tailor your resume, prep for interviews, generate cover letters</li>
        <li><strong>Track applications</strong> — stay on top of every stage</li>
      </ul>
      <p>Get started by uploading your resume!</p>
      <p style="color:#6b7280;font-size:13px">CVPilot — Powered by Claude AI</p>
    </div>
    """
    await _send_via_sendgrid(email, name, "Welcome to CVPilot!", html)


async def send_weekly_digest(email: str, name: str, new_jobs: int, active_applications: int, ats_score: int | None) -> None:
    score_section = f"<p>Your ATS score: <strong>{ats_score}/100</strong></p>" if ats_score else ""
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#6366f1">Your weekly career update, {name}</h2>
      {score_section}
      <p><strong>{new_jobs}</strong> new jobs matching your profile this week.</p>
      <p>You have <strong>{active_applications}</strong> active applications in progress.</p>
      <p>Open the CVPilot app to review your matches and update your applications.</p>
      <p style="color:#6b7280;font-size:13px">CVPilot — Powered by Claude AI</p>
    </div>
    """
    await _send_via_sendgrid(email, name, "Your weekly CVPilot update", html)


async def send_application_status_email(email: str, name: str, job_title: str, company: str, new_status: str) -> None:
    status_labels = {
        "screening": "Screening",
        "interview": "Interview",
        "offer": "Offer received",
        "rejected": "Not selected",
        "withdrawn": "Withdrawn",
    }
    label = status_labels.get(new_status, new_status.title())
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#6366f1">Application update: {job_title} at {company}</h2>
      <p>Hi {name},</p>
      <p>Your application status has been updated to <strong>{label}</strong>.</p>
      <p>Open CVPilot to view details and next steps.</p>
      <p style="color:#6b7280;font-size:13px">CVPilot — Powered by Claude AI</p>
    </div>
    """
    await _send_via_sendgrid(email, name, f"Application update: {job_title}", html)
