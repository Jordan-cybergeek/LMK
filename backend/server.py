"""
LMK Backend Server — Ready for Render.com deployment
- Agent chat API with LLM fallback (hybrid: keyword matching + AI)
- Analytics tracking (page views, chat events, agent usage)
- Serves static frontend + API on single port
"""

import json
import os
import time
import ssl
import urllib.request
import urllib.error
import sqlite3
import hashlib
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='../', static_url_path='')

# ─── Provider Config (same pattern as Franklin) ──────────────
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
GROQ_URL = "https://api.groq.com/openai/v1"
OVH_URL = "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions"

PROVIDER_FALLBACK = [
    ("groq/llama-3.1-8b-instant", GROQ_URL, "GROQ_API_KEY"),
    ("openai/gpt-oss-120b", OVH_URL, None),
    ("meta-llama/llama-3.1-8b-instruct", OPENROUTER_URL, "OPENROUTER_API_KEY_FRANKLIN"),
]

MODEL = "groq/llama-3.1-8b-instant"

# ─── Agent Personalities (system prompts) ────────────────────
AGENT_PERSONAS = {
    "thandi": """You are Thandi, a warm and welcoming AI receptionist for LMK — an AI automation platform for South African real estate agencies. 
You greet visitors, answer general questions about LMK, and direct them to the right specialist.
Personality: warm, nurturing, genuine. Use occasional Afrikaans phrases naturally (like "ja", "lekker").
Keep responses concise (2-3 sentences). Sound human, not robotic.""",

    "jason": """You are Jason, a confident sales specialist for LMK — an AI automation platform for South African real estate agencies.
You focus on ROI, numbers, and results. You're direct and honest — if something isn't right for someone, you'll tell them.
Personality: confident, direct, results-driven. Use specific numbers when possible.
Keep responses concise (2-3 sentences). No fluff.""",

    "nadia": """You are Nadia, an estate agent assistant for LMK — an AI automation platform for South African real estate agencies.
You understand the daily grind of being an estate agent and explain how LMK helps.
Personality: knowledgeable, professional, empathetic to agents' challenges.
Keep responses concise (2-3 sentences).""",

    "pieter": """You are Pieter, a patient customer support agent for LMK — an AI automation platform for South African real estate agencies.
You help with technical questions, setup issues, and walk people through solutions step by step.
Personality: patient, calm, methodical. Use simple language, no jargon.
Keep responses concise (2-3 sentences).""",

    "zinhle": """You are Zinhle, an energetic booking specialist for LMK — an AI automation platform for South African real estate agencies.
You help with scheduling demos, setting up viewings, and explaining the booking system.
Personality: energetic, efficient, slightly cheeky. Love getting things done.
Keep responses concise (2-3 sentences).""",

    "david": """You are David, a knowledgeable property assistant for LMK — an AI automation platform for South African real estate agencies.
You know the SA property market deeply — areas, prices, trends, bond calculations, regulations.
Personality: calm, analytical, authoritative but not arrogant. Cite data when possible.
Keep responses concise (2-3 sentences)."""
}

# ─── Product Knowledge Base ──────────────────────────────────
LMK_KNOWLEDGE = """
LMK is an AI automation platform for South African real estate agencies.

PRICING:
- Starter: R1,499/month — up to 100 leads/month, WhatsApp integration, 1 AI agent, basic analytics
- Professional: R3,499/month — up to 500 leads/month, all 6 AI agents, calendar sync, follow-up sequences, priority support
- Enterprise: Custom pricing — unlimited leads, custom AI training, API access, dedicated account manager

FEATURES:
- WhatsApp Business AI — responds to leads in under 10 seconds, 24/7
- Lead qualification — asks budget, location, timeline, pre-approval status; scores hot/warm/cold
- Automated follow-up — 1 day, 3 days, 7 days, 14 days after initial contact
- Calendar sync — integrates with Google Calendar for automatic viewing bookings
- AI Team: 6 specialists (receptionist, sales, estate assistant, support, booking, property)
- Analytics dashboard — leads captured, response times, conversion rates

SETUP: Takes 24 hours. Connect WhatsApp, tell us about your agency (areas, listings, pricing), and the AI starts working.

TRIAL: 7-day free trial on all plans. Setup fee of R8,000 waived for first 10 Roodepoort agencies.

CONTACT: Email: Jordankafundawetou@gmail.com | WhatsApp: +27 10 594 0600
LOCATION: South Africa — serving agencies nationwide with focus on Gauteng.
"""

# ─── LLM Integration ─────────────────────────────────────────
def get_api_key(key_name):
    return os.environ.get(key_name, "")

def llm_call(system_prompt, user_message, conversation_history=None):
    messages = [{"role": "system", "content": system_prompt + "\n\n" + LMK_KNOWLEDGE}]
    if conversation_history:
        for msg in conversation_history[-6:]:
            role = "assistant" if msg.get("role") == "agent" else "user"
            messages.append({"role": role, "content": msg.get("text", "")})
    messages.append({"role": "user", "content": user_message})
    providers = [(MODEL, GROQ_URL, get_api_key("GROQ_API_KEY"))]
    for fb_model, fb_url, fb_key_name in PROVIDER_FALLBACK:
        key = get_api_key(fb_key_name) if fb_key_name else ""
        providers.append((fb_model, fb_url, key))
    ssl_ctx = ssl.create_default_context()
    for prov_model, prov_url, prov_key in providers:
        if not prov_key and prov_url != OVH_URL:
            continue
        payload = json.dumps({
            "model": prov_model, "messages": messages, "max_tokens": 200, "temperature": 0.5,
        }).encode()
        headers = {"Content-Type": "application/json"}
        if prov_key:
            headers["Authorization"] = f"Bearer {prov_key}"
        req = urllib.request.Request(prov_url, data=payload, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=15, context=ssl_ctx) as resp:
                data = json.loads(resp.read())
                if "choices" in data and len(data["choices"]) > 0:
                    return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print(f"[LLM] {prov_model} failed: {e}")
            continue
    return None

# ─── Analytics Database ──────────────────────────────────────
DB_PATH = Path(__file__).parent / "analytics.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            event_data TEXT,
            agent_id TEXT,
            session_id TEXT,
            ip_hash TEXT,
            user_agent TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    c.execute("CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id)")
    conn.commit()
    conn.close()

def track_event(event_type, event_data=None, agent_id=None, session_id=None):
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        ip = request.remote_addr or "unknown"
        ip_hash = hashlib.sha256(ip.encode()).hexdigest()[:16]
        user_agent = request.headers.get("User-Agent", "")[:200]
        c.execute("""
            INSERT INTO events (event_type, event_data, agent_id, session_id, ip_hash, user_agent)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (event_type, json.dumps(event_data) if event_data else None,
              agent_id, session_id, ip_hash, user_agent))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[Analytics] Error: {e}")

def get_session_id():
    sid = request.headers.get("X-Session-ID")
    if not sid:
        sid = request.cookies.get("lmk_session")
    if not sid:
        sid = hashlib.sha256(f"{request.remote_addr}{time.time()}".encode()).hexdigest()[:16]
    return sid

# ─── API Routes ──────────────────────────────────────────────

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data"}), 400
    agent_id = data.get("agent_id", "thandi")
    user_message = data.get("message", "").strip()
    history = data.get("history", [])
    session_id = get_session_id()
    if not user_message:
        return jsonify({"error": "No message"}), 400
    if agent_id not in AGENT_PERSONAS:
        return jsonify({"error": "Unknown agent"}), 400
    track_event("chat_message", {"message_length": len(user_message)}, agent_id, session_id)
    system_prompt = AGENT_PERSONAS[agent_id]
    response = llm_call(system_prompt, user_message, history)
    if not response:
        response = "I'm having trouble connecting right now. Please try again in a moment, or reach out to us directly at Jordankafundawetou@gmail.com — we'd love to help!"
        track_event("llm_fallback", {"agent_id": agent_id}, agent_id, session_id)
    return jsonify({"response": response, "agent_id": agent_id, "session_id": session_id})

@app.route("/api/analytics/event", methods=["POST"])
def analytics_event():
    data = request.get_json() or {}
    session_id = get_session_id()
    track_event(data.get("type", "custom"), data.get("data"), session_id=session_id)
    return jsonify({"status": "ok", "session_id": session_id})

@app.route("/api/analytics/dashboard")
def dashboard():
    auth = request.args.get("key", "")
    if auth != os.environ.get("LMK_ADMIN_KEY", "lmk-admin-2026"):
        return jsonify({"error": "Unauthorized"}), 401
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM events WHERE timestamp > datetime('now', '-7 days')")
    total_events_7d = c.fetchone()[0]
    c.execute("SELECT COUNT(DISTINCT session_id) FROM events WHERE event_type='page_view' AND timestamp > datetime('now', '-7 days')")
    visitors_7d = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM events WHERE event_type='chat_message' AND timestamp > datetime('now', '-7 days')")
    chats_7d = c.fetchone()[0]
    c.execute("""
        SELECT agent_id, COUNT(*) as count FROM events 
        WHERE event_type='chat_message' AND timestamp > datetime('now', '-7 days')
        GROUP BY agent_id ORDER BY count DESC
    """)
    agent_stats = [{"agent": row[0], "messages": row[1]} for row in c.fetchall()]
    c.execute("""
        SELECT DATE(timestamp) as day, event_type, COUNT(*) 
        FROM events WHERE timestamp > datetime('now', '-7 days')
        GROUP BY day, event_type ORDER BY day DESC
    """)
    daily = [{"day": row[0], "type": row[1], "count": row[2]} for row in c.fetchall()]
    c.execute("""
        SELECT json_extract(event_data, '$.path') as path, COUNT(*) as views
        FROM events WHERE event_type='page_view' AND timestamp > datetime('now', '-7 days')
        GROUP BY path ORDER BY views DESC LIMIT 10
    """)
    top_pages = [{"path": row[0] or "/", "views": row[1]} for row in c.fetchall()]
    conn.close()
    return jsonify({
        "period": "last_7_days", "total_events": total_events_7d,
        "unique_visitors": visitors_7d, "chat_messages": chats_7d,
        "agent_popularity": agent_stats, "daily_breakdown": daily, "top_pages": top_pages
    })

# ─── Static file serving ─────────────────────────────────────
@app.route("/")
def serve_index():
    return send_from_directory("../", "index.html")

@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory("../", path)

# ─── Start ───────────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 5000))
    print(f"[LMK] Server starting on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)
