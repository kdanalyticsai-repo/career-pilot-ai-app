import hashlib
import hmac
import json
import urllib.parse

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.services.subscription_service import PLANS, get_all_usage, FREE_LIMITS

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

BACKEND_URL = "https://cvpilot-backend-hop4.onrender.com"


def _payment_html(uid: str, email: str, name: str, key_id: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>CVPilot Pro – Upgrade</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    *{{box-sizing:border-box;margin:0;padding:0}}
    body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}}
    .card{{background:#fff;border-radius:16px;padding:40px 32px;max-width:400px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center}}
    .logo{{font-size:40px;margin-bottom:16px}}
    h1{{font-size:22px;font-weight:700;color:#1a1a1a;margin-bottom:8px}}
    .subtitle{{color:#666;font-size:15px;margin-bottom:24px;line-height:1.5}}
    .price{{background:#f0f4ff;border-radius:12px;padding:20px;margin-bottom:24px}}
    .price-amount{{font-size:42px;font-weight:800;color:#4361EE}}
    .price-per{{color:#666;font-size:14px;margin-top:4px}}
    .features{{text-align:left;margin-bottom:28px}}
    .feature{{display:flex;align-items:center;gap:10px;padding:6px 0;font-size:14px;color:#333}}
    .check{{color:#22c55e;font-weight:700}}
    .pay-btn{{width:100%;background:#4361EE;color:#fff;border:none;border-radius:12px;padding:16px;font-size:16px;font-weight:700;cursor:pointer;transition:opacity .2s}}
    .pay-btn:hover{{opacity:.9}}
    .pay-btn:disabled{{opacity:.6;cursor:not-allowed}}
    .note{{font-size:12px;color:#999;margin-top:16px;line-height:1.6}}
    #success{{display:none}}
    #success h2{{color:#22c55e;font-size:24px;margin-bottom:12px}}
    #success p{{color:#555;font-size:15px;line-height:1.6}}
  </style>
</head>
<body>
<div class="card">
  <div id="payment-view">
    <div class="logo">✦</div>
    <h1>Upgrade to CVPilot Pro</h1>
    <p class="subtitle">Unlimited AI coaching, job matches, and career tools.</p>
    <div class="price">
      <div class="price-amount">₹1</div>
      <div class="price-per">per month · cancel anytime</div>
    </div>
    <div class="features">
      <div class="feature"><span class="check">✓</span> Unlimited AI Career Coach chats</div>
      <div class="feature"><span class="check">✓</span> Unlimited interview prep</div>
      <div class="feature"><span class="check">✓</span> Unlimited job matches</div>
      <div class="feature"><span class="check">✓</span> 10 resume tailorings / month</div>
      <div class="feature"><span class="check">✓</span> Unlimited cover letters</div>
      <div class="feature"><span class="check">✓</span> Up to 5 resume uploads</div>
      <div class="feature"><span class="check">✓</span> Unlimited application tracking</div>
    </div>
    <button class="pay-btn" id="payBtn" onclick="startPayment()">
      Pay ₹1 — UPI / Card / Net Banking
    </button>
    <p class="note">Powered by Razorpay · Secure payment<br>
    After payment, return to the CVPilot app and pull down to refresh your profile.</p>
  </div>
  <div id="success">
    <div class="logo">🎉</div>
    <h2>Payment Successful!</h2>
    <p>Your CVPilot account has been upgraded to Pro.<br><br>
    Return to the app and pull down to refresh your profile — your Pro badge will appear within a minute.</p>
  </div>
</div>
<script>
  function startPayment() {{
    var btn = document.getElementById('payBtn');
    btn.disabled = true;
    btn.textContent = 'Opening payment…';
    var options = {{
      key: '{key_id}',
      amount: 100,
      currency: 'INR',
      name: 'CVPilot',
      description: 'Pro subscription — monthly',
      prefill: {{ email: '{email}', name: '{name}' }},
      notes: {{ user_id: '{uid}', plan: 'pro' }},
      theme: {{ color: '#4361EE' }},
      handler: function(response) {{
        document.getElementById('payment-view').style.display = 'none';
        document.getElementById('success').style.display = 'block';
      }},
      modal: {{
        ondismiss: function() {{
          btn.disabled = false;
          btn.textContent = 'Pay ₹1 — UPI / Card / Net Banking';
        }}
      }}
    }};
    new Razorpay(options).open();
  }}
</script>
</body>
</html>"""


@router.get("/pay", response_class=HTMLResponse, include_in_schema=False)
async def payment_page(uid: str = "", email: str = "", name: str = ""):
    """Hosted Razorpay checkout page — opened in browser from the app."""
    if not uid:
        return HTMLResponse("<h2>Invalid payment link. Please return to the app.</h2>", status_code=400)
    if not settings.RAZORPAY_KEY_ID:
        return HTMLResponse("<h2>Payment not configured yet. Please try again later.</h2>", status_code=503)
    return HTMLResponse(_payment_html(uid, email, name, settings.RAZORPAY_KEY_ID))


@router.get("/plans")
async def list_plans():
    return {"plans": PLANS}


@router.get("/my-usage")
async def get_my_usage(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    usage = await get_all_usage(db, current_user.id)
    plan = current_user.subscription or "free"
    plan_data = PLANS.get(plan, PLANS["free"])

    features = plan_data["features"]
    result = {}

    for feature, monthly_limit in FREE_LIMITS.items():
        used = usage.get(feature, 0)
        if plan == "pro":
            result[feature] = {"used": used, "limit": None, "blocked": False}
        else:
            blocked = monthly_limit is None
            result[feature] = {
                "used": used,
                "limit": monthly_limit,
                "blocked": blocked,
            }

    return {
        "plan": plan,
        "usage": result,
        "resume_uploads": features.get("resume_uploads"),
        "application_tracking": features.get("application_tracking"),
    }


@router.get("/payment-url")
async def get_payment_url(current_user: User = Depends(get_current_user)):
    """Return the hosted payment page URL pre-filled with the user's identity."""
    if current_user.subscription == "pro":
        raise HTTPException(400, "Already on Pro plan")

    params = urllib.parse.urlencode({
        "uid": current_user.id,
        "email": current_user.email or "",
        "name": current_user.name or "",
    })
    return {"url": f"{BACKEND_URL}/api/v1/subscriptions/pay?{params}"}


@router.post("/razorpay-webhook")
async def razorpay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Razorpay posts here after a successful payment.
    Verifies the webhook signature, then upgrades the user identified in notes.
    Configure this URL in the Razorpay dashboard → Webhooks.
    """
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    if not settings.RAZORPAY_WEBHOOK_SECRET:
        raise HTTPException(500, "Webhook secret not configured")

    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        raise HTTPException(400, "Invalid webhook signature")

    payload = json.loads(body)
    event = payload.get("event", "")

    user_id: str | None = None

    if event == "payment.captured":
        notes = payload.get("payload", {}).get("payment", {}).get("entity", {}).get("notes", {})
        user_id = notes.get("user_id")

    elif event == "subscription.charged":
        notes = payload.get("payload", {}).get("subscription", {}).get("entity", {}).get("notes", {})
        user_id = notes.get("user_id")

    if user_id:
        user = await db.get(User, user_id)
        if user and user.subscription != "pro":
            user.subscription = "pro"
            await db.commit()

    return {"status": "ok"}


@router.post("/downgrade")
async def downgrade_to_free(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.subscription = "free"
    await db.commit()
    return {"subscription": "free"}
