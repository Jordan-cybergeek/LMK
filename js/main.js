/* LMK — Main JavaScript */

// ─── Scroll-triggered header ──────────────────────────────────
window.addEventListener('scroll', function () {
  const header = document.getElementById('main-header');
  if (!header) return;
  header.classList.toggle('scrolled', window.scrollY > window.innerHeight * 0.1);
});

// ─── Mobile nav ───────────────────────────────────────────────
function closeMobileNav() {
  const nav = document.getElementById('mobileNav');
  if (nav) nav.classList.remove('open');
}

document.getElementById('mobileToggle') && document.getElementById('mobileToggle').addEventListener('click', function() {
  const nav = document.getElementById('mobileNav');
  if (nav) nav.classList.toggle('open');
});

// ─── Hero parallax ────────────────────────────────────────────
window.addEventListener('scroll', function() {
  const heroBg = document.getElementById('heroBg');
  if (!heroBg) return;
  const scrolled = window.scrollY;
  heroBg.style.transform = 'scale(1.05) translateY(' + (scrolled * 0.3) + 'px)';
});

// ─── Scroll reveal (IntersectionObserver) ─────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });

document.querySelectorAll('.reveal-on-scroll').forEach(el => {
  revealObserver.observe(el);
});

// ─── Animated counters ────────────────────────────────────────
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = parseInt(el.getAttribute('data-count'));
      const suffix = (el.nextElementSibling && el.nextElementSibling.textContent) || '';
      let current = 0;
      const increment = Math.ceil(target / 40);
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        el.textContent = current;
      }, 40);
      counterObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-number').forEach(el => {
  counterObserver.observe(el);
});

// ─── Analytics ───────────────────────────────────────────────
let sessionId = null;

function initAnalytics() {
  // Generate or retrieve session ID
  sessionId = localStorage.getItem('lmk_session');
  if (!sessionId) {
    sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('lmk_session', sessionId);
  }
  // Track page view
  trackAnalytics('page_view', {
    path: window.location.pathname,
    referrer: document.referrer || '',
    title: document.title
  });
}

function trackAnalytics(type, data) {
  const payload = { type, data };
  if (sessionId) payload.data = Object.assign({}, data, { session_id: sessionId });
  
  // Use sendBeacon for reliability (works even on page unload)
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  navigator.sendBeacon('/api/analytics/event', blob);
}

// ─── AI Team Chat ─────────────────────────────────────────────
const agents = {
  thandi: {
    id: 'thandi',
    name: 'Thandi',
    photo: 'agents/Thandi.jpeg',
    role: 'Receptionist',
    personality: 'warm, welcoming, nurturing — sounds like a real South African receptionist who genuinely loves people. Uses occasional Afrikaans phrases naturally. Makes everyone feel at home.',
    greeting: "Sawubona! 👋 I'm Thandi — your first stop at LMK. Whether you're just browsing or ready to transform your agency, I'm here to help. How are you today?",
    responses: {
      pricing: "Ah, let me break that down nicely for you! We've got three plans: Starter at R1,499/mo if you're just getting going, Professional at R3,499/mo which is our most popular — that gives you the full team of all 6 agents. And Enterprise is custom for the big agencies. Which one sounds like it fits?",
      demo: "Oooh, a demo! You're going to love this. We'll show you exactly how our agents handle real WhatsApp leads from real estate agencies. Fair warning though — most people sign up after seeing it! 😄 Should I get your name and email so we can set that up?",
      whatsapp: "Yes! Okay so this is my favourite thing to explain. Your agency's WhatsApp number? We plug our AI into it. So when someone messages 'Hi, I'm looking for a 3-bed in Roodepoort' at 10pm on a Saturday, the AI responds in seconds. Not hours. Seconds. Your competition is still asleep! 😉",
      small_talk: "You know what, I love that! Ja, the weather's been wild today. But hey — while you're here, can I show you something cool? Our AI agents have handled over 247,000 leads for agencies across SA. Even if you're just curious, no pressure!",
      competition: "Good question! Look, there are other tools out there, but here's what makes us different — we're built specifically for South African real estate. Our agents understand our areas, our market, our way of doing business. Plus they chat on WhatsApp — where your clients already are. No app to download.",
      default: "You know what, that's a really great question and I want to make sure I give you the right answer. Let me check with one of my colleagues who specialises in that... or you can always book a demo and we'll show you everything personally! 😊"
    }
  },
  jason: {
    id: 'jason',
    name: 'Jason',
    photo: 'agents/Jason.jpeg',
    role: 'Sales Agent',
    personality: 'confident, direct, results-driven — knows real estate metrics inside out. Speaks in numbers and ROI. Not pushy, just facts. Will tell you if something is NOT worth your money too.',
    greeting: "Hey! Jason here. I'm the numbers guy — I'll tell you exactly what LMK will do for your bottom line. No fluff, no BS. What's your agency situation right now?",
    responses: {
      pricing: "Okay, let's talk ROI because that's what actually matters. Our Starter plan is R1,499/mo. Professional is R3,499. If this AI captures ONE extra qualified lead per month — just ONE — it's paid for itself 10x over. Average commission on a property sale in SA is what, R40-60k? So the maths is pretty simple, right?",
      demo: "Look, I'll be straight with you — our demo is genuinely impressive. Not because I'm saying it, but because the numbers speak for themselves. Agencies using us book 12+ more viewings per month. That's not a marketing stat, that's Craig from EZI Properties who told us after 30 days. Book it, you'll see.",
      whatsapp: "WhatsApp is where the game is won or lost in SA real estate right now. 90% of your leads are messaging you there. If it takes you 30 minutes to respond — and you're showing property or helping another client — that lead is GONE. Our AI responds in 10 seconds. Every time. 24/7.",
      roi: "Okay so you're talking my language! Here's the deal: most of our clients pay for the software in the first 2 weeks. One extra conversion pays for 3 months of the Professional plan. We have agencies doing R200k+ more revenue per quarter. We also have some agencies where it didn't work — usually because they had no leads coming in to begin with. If you're getting inquiries, we'll convert more of them.",
      small_talk: "Ha, appreciate the vibes! But you know what I love talking about more? Conversions. What's your current agency situation — are you getting leads but losing them, or not getting enough in the first place? Two different problems, two different solutions.",
      competition: "Honestly? Most agencies are still using nothing. Spreadsheets maybe. If you're comparing us to other AI tools — most are generic chatbots. We know real estate. We know SA market. We know that 'How much for a 3-bed in Fourways?' needs a specific answer, not a generic 'Thank you for your enquiry.' That's the difference.",
      default: "That's a solid question. Here's my honest take: if it doesn't help you close more deals or save you time, it's probably not for you. Let me be real with you — what size agency are you running? Number of agents, monthly leads? That'll help me give you a straight answer."
    }
  },
  nadia: {
    id: 'nadia',
    name: 'Nadia',
    photo: 'agents/Nadia.jpeg',
    role: 'Estate Agent Assistant',
    personality: 'knowledgeable, professional, detail-oriented — understands the real estate agent\'s daily grind. Empathetic to both agents and clients. Explains processes clearly.',
    greeting: "Hello! I'm Nadia — I know what it's like being an estate agent in SA. The long hours, the chasing, the follow-ups you forget at 9pm. I'm here to show you how AI makes all that easier. What are you struggling with most?",
    responses: {
      pricing: "Right, so pricing for us is based on lead volume because that's how it scales with you. Starter handles up to 100 leads a month at R1,499 — that's about R15 per lead. Professional does 500 at R3,499 — that's R7 per lead with way more features. As you grow, the cost per lead actually goes down.",
      demo: "I'd love to show you! The demo is really tailored — we don't do a generic pitch. We'll show you exactly what it looks like when a lead comes through WhatsApp, how the qualification works, and what your dashboard looks like. Very practical. Want me to set one up?",
      whatsapp: "This is literally what we do best. So here's how it works: a lead messages your agency WhatsApp. Within 10 seconds, our AI responds — asks them about budget, area, property type, timeline. It scores them hot/warm/cold. Then it books a viewing if they're hot, or follows up automatically if they're warm. You just show up to the viewing.",
      qualification: "Okay so our qualification process is really thorough. The AI asks: What's your budget? Which areas? Property type? Are you pre-approved? Cash or bond? Timeline — are you looking now or in 6 months? Based on the answers, it scores them. Hot = ready to view this week. Warm = interested but not urgent. Cold = just browsing. You focus on the hot ones.",
      follow_up: "Oh my gosh, follow-up is where most agents lose deals! Our AI sends automatic follow-ups — 1 day after, 3 days, 7 days, 14 days. Personalised messages based on what they asked about. It's like having a PA who never forgets and never sleeps.",
      small_talk: "Ha! You know, I hear this all the time from agents — they're just exhausted from trying to do everything. Admin, follow-ups, qualifying, showing, negotiating... Something's gotta give. That's literally why we built this. So you can focus on the parts only YOU can do.",
      default: "That's a really good question. In my experience working with agents, this comes up a lot. Let me give you the most practical answer I can — or if it's something really specific, I'd recommend a demo where we can show you exactly how it works."
    }
  },
  pieter: {
    id: 'pieter',
    name: 'Pieter',
    photo: 'agents/Pieter.jpeg',
    role: 'Customer Support',
    personality: 'patient, calm, methodical — the guy who never gets flustered. Speaks in a reassuring way. Will walk you through anything step by step. Uses simple language, no jargon.',
    greeting: "Hi there! Pieter here. Something not working? Or just have a question about how something works? Either way, I've got you. What can I help with?",
    responses: {
      pricing: "Sure thing! So we've got three tiers. Starter: R1,499/month — that gives you up to 100 leads and one AI agent. Professional: R3,499/month — up to 500 leads, all 6 agents, calendar sync, the works. Enterprise: custom pricing for bigger agencies. All plans have a 7-day free trial so you can test before you commit.",
      demo: "No problem at all! The demo takes about 20 minutes. We'll show you the whole system live — how a lead comes in, how the AI handles it, what your dashboard looks like. Very straightforward. Just fill in the form on the page and we'll set it up.",
      whatsapp: "Great question! Setting up WhatsApp is actually really simple. We give you a QR code, you scan it with your phone, and that's it — connected. Takes about 2 minutes. If you get stuck at any point, I'm here to walk you through it step by step.",
      technical: "Okay, let's sort this out together. First things first — can you tell me exactly what's happening? Any error messages? What device and browser you're on? Don't worry, we'll get this fixed. 99% of issues are resolved in under 5 minutes.",
      setup: "Setup is honestly super easy. Step 1: Sign up. Step 2: Connect your WhatsApp (we give you a QR code). Step 3: Tell us about your agency — areas, listings, pricing. Step 4: Done. Your AI is live. Most agencies are up and running within 24 hours.",
      small_talk: "Haha, no worries at all! I'm here whenever you need me. But while you're here — is there anything about LMK you'd like me to explain? I'm pretty patient, ask me anything! 😄",
      default: "That's a fair question! Let me explain it as simply as I can. And if anything is unclear, just tell me and I'll explain it a different way. There are no silly questions here."
    }
  },
  zinhle: {
    id: 'zinhle',
    name: 'Zinhle',
    photo: 'agents/Zinhle.jpeg',
    role: 'Booking Agent',
    personality: 'energetic, efficient, organised — gets things done fast. Loves making things happen. Slightly cheeky sense of humour. Always has a solution.',
    greeting: "Hey hey! 👋 Zinhle here — I'm all about getting things DONE. Need to book a demo? Schedule a viewing? Set up your account? I'm your girl. What are we sorting out today?",
    responses: {
      pricing: "Okay quick breakdown because I know you're busy! Starter R1,499 — solo agents. Professional R3,499 — growing agencies, this one's the sweet spot. Enterprise — big teams, custom pricing. All include the 7-day trial. My recommendation? Start with Pro, you'll thank me later! 😉",
      demo: "Yesss, let's get you booked in! The demo is 20 minutes, super practical, and honestly pretty impressive. Drop your name and email in the form and we'll reach out to find a time that works. Or if you want, tell me your email now and I'll note it down!",
      whatsapp: "Okay so booking through WhatsApp is where it gets exciting. Lead messages you → AI responds instantly → qualifies them → if they're hot, it checks YOUR calendar → books the viewing → sends them a confirmation. All while you're sleeping. It's like magic but it's just good tech! ✨",
      booking: "Booking is literally what I do best! Here's the flow: AI qualifies the lead → asks when they want to view → checks your calendar availability → books the slot → sends them the address and time → reminds them 1 hour before. You just show up. Easy!",
      calendar: "We sync with Google Calendar — that's it, no extra apps. When a lead wants to view, we check your free slots and book it. You'll get a notification. If you need to reschedule, just tell me or update your calendar and it handles the rest.",
      small_talk: "Love the energy! 🎉 You know what else is exciting? Watching your booking calendar fill up by itself. That's what happens when our AI is working 24/7. Leads booking viewings while you're having lunch. It's beautiful!",
      default: "Ooh good question! Let me sort that out for you. If I don't have the exact answer right now, I'll find out and get back to you. I don't do vague — I do solutions! 😄"
    }
  },
  david: {
    id: 'david',
    name: 'David',
    photo: 'agents/David.jpeg',
    role: 'Property Assistant',
    personality: 'calm, knowledgeable, analytical — the wise one. Knows SA property market deeply. Gives thoughtful, considered answers. Will cite actual data. Speaks with authority but not arrogance.',
    greeting: "Good day. David here. I know the South African property market — areas, prices, trends, regulations, bond calculations. Whatever property question you have, I'll give you a proper answer. What would you like to know?",
    responses: {
      pricing: "From a value perspective, consider this: the average time an agent spends manually qualifying a lead is 15-20 minutes. If you get 100 leads a month, that's 25-30 hours of work. Our Starter plan at R1,499 effectively gives you that time back. The Professional plan at R3,499 includes automated follow-up alone which most agencies say saves 40+ hours monthly.",
      demo: "I would recommend the demo, yes. It's the best way to see whether our system aligns with your agency's workflow. We show you real scenarios — actual lead handling, qualification scoring, booking flow. Very transparent. No hidden surprises.",
      whatsapp: "WhatsApp Business integration is standard across all our plans. The AI handles the initial conversation, qualification, and booking. You retain full visibility of all conversations. Nothing happens without you seeing it — the AI assists, it doesn't replace your judgment.",
      bond: "For bond calculations, here's a quick reference: On a R1.5M property at 11.75% interest over 20 years, monthly repayment is approximately R15,800. R2M would be roughly R21,100/month. R800k would be about R8,400/month. These exclude rates, taxes, and insurance. Would you like me to calculate a specific amount?",
      area: "I have comprehensive data on South African neighbourhoods. I can tell you average property prices, recent sales trends, school districts, crime statistics, and amenities for most areas. Which suburb or city are you interested in?",
      market: "The SA property market in 2025/2026 shows interesting trends: Gauteng remains the volume leader, but the Western Cape continues price growth. First-time buyers are increasingly active in the R800k-R1.5M bracket. Interest rates at 11.75% are making buyers more cautious, which means lead qualification is more important than ever — you want to focus on serious buyers.",
      investment: "For investment properties, the key metrics are: rental yield (aim for 8-10% gross in SA), capital growth potential, and vacancy rates. Areas like Midrand, Somerset West, and Ballito are showing strong rental demand. I can run specific numbers if you give me a property price and area.",
      small_talk: "Indeed. Now, is there something specific about the property market I can help with? I find that a well-informed agent closes more deals — knowledge is genuinely your best sales tool.",
      default: "That's an interesting question. Let me give you a thorough answer based on the data I have. If it's something very specific to a particular area or situation, I may need a bit more detail to give you accurate information."
    }
  }
};

let currentAgent = null;
let conversationHistory = [];

function openChat(agentId) {
  currentAgent = agents[agentId];
  if (!currentAgent) return;

  document.getElementById('chatAgentPhoto').src = currentAgent.photo;
  document.getElementById('chatAgentName').textContent = currentAgent.name;
  document.getElementById('chatAgentNameMsg').textContent = currentAgent.name;

  const messagesContainer = document.getElementById('chatMessages');
  messagesContainer.innerHTML = '<div class="chat-msg agent"><span>' + currentAgent.greeting + '</span></div>';

  conversationHistory = [{ role: 'agent', text: currentAgent.greeting }];

  document.getElementById('chatWidget').classList.add('open');
  document.getElementById('chatInput').focus();
  trackAnalytics('chat_open', { agent: agentId });
}

// Prevent chat panel clicks from bubbling to overlay
(function() {
  const panel = document.querySelector('.chat-panel');
  if (panel) {
    panel.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }
  const overlay = document.querySelector('.chat-overlay');
  if (overlay) {
    overlay.addEventListener('click', function() {
      closeChat();
    });
  }
  const closeBtn = document.querySelector('.chat-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      closeChat();
    });
  }
})();

function closeChat() {
  const widget = document.getElementById('chatWidget');
  widget.classList.remove('open');
  currentAgent = null;
  conversationHistory = [];
  const messagesContainer = document.getElementById('chatMessages');
  if (messagesContainer) {
    messagesContainer.innerHTML = "";
  }
}

function sendMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text || !currentAgent) return;

  const messagesContainer = document.getElementById('chatMessages');

  const userMsg = document.createElement('div');
  userMsg.className = 'chat-msg user';
  userMsg.innerHTML = '<span>' + text + '</span>';
  messagesContainer.appendChild(userMsg);

  conversationHistory.push({ role: 'user', text: text });
  input.value = '';
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // Show typing indicator
  const typingMsg = document.createElement('div');
  typingMsg.className = 'chat-msg agent typing';
  typingMsg.innerHTML = '<span class="typing-dots"><span></span><span></span><span></span></span>';
  messagesContainer.appendChild(typingMsg);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // Try keyword match first (instant)
  const keywordResponse = getResponse(text, currentAgent);
  const isDefaultFallback = keywordResponse === currentAgent.responses.default;
  
  if (!isDefaultFallback) {
    // Instant response from keyword matching
    setTimeout(() => {
      typingMsg.remove();
      const agentMsg = document.createElement('div');
      agentMsg.className = 'chat-msg agent';
      agentMsg.innerHTML = '<span>' + keywordResponse + '</span>';
      messagesContainer.appendChild(agentMsg);
      conversationHistory.push({ role: 'agent', text: keywordResponse });
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 600 + Math.random() * 400);
  } else {
    // Use LLM for complex/unmatched questions
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: currentAgent.id,
        message: text,
        history: conversationHistory.slice(-6)
      })
    })
    .then(r => r.json())
    .then(data => {
      setTimeout(() => {
        typingMsg.remove();
        const agentMsg = document.createElement('div');
        agentMsg.className = 'chat-msg agent';
        const response = data.response || keywordResponse;
        agentMsg.innerHTML = '<span>' + response + '</span>';
        messagesContainer.appendChild(agentMsg);
        conversationHistory.push({ role: 'agent', text: response });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 800 + Math.random() * 600);
    })
    .catch(() => {
      setTimeout(() => {
        typingMsg.remove();
        const agentMsg = document.createElement('div');
        agentMsg.className = 'chat-msg agent';
        agentMsg.innerHTML = '<span>' + keywordResponse + '</span>';
        messagesContainer.appendChild(agentMsg);
        conversationHistory.push({ role: 'agent', text: keywordResponse });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 800);
    });
  }
}

function getResponse(input, agent) {
  const lower = input.toLowerCase();
  const r = agent.responses;

  // Match based on keywords — each agent has unique responses per topic
  if (lower.includes('price') || lower.includes('cost') || lower.includes('how much') || lower.includes('pricing') || lower.includes('plan') || lower.includes('package')) {
    return r.pricing || r.default;
  }
  if (lower.includes('demo') || lower.includes('trial') || lower.includes('test') || lower.includes('see it') || lower.includes('show me')) {
    return r.demo || r.default;
  }
  if (lower.includes('whatsapp') || lower.includes('message') || lower.includes('chat') || lower.includes('connect')) {
    return r.whatsapp || r.default;
  }
  if (lower.includes('roi') || lower.includes('return') || lower.includes('worth') || lower.includes('pay for') || lower.includes('value') || lower.includes('profit')) {
    return r.roi || r.default;
  }
  if (lower.includes('qualif') || lower.includes('lead') || lower.includes('buyer') || lower.includes('score') || lower.includes('hot') || lower.includes('warm')) {
    return r.qualification || r.default;
  }
  if (lower.includes('follow') || lower.includes('remind') || lower.includes('sequence')) {
    return r.follow_up || r.default;
  }
  if (lower.includes('book') || lower.includes('schedule') || lower.includes('appointment') || lower.includes('viewing')) {
    return r.booking || r.default;
  }
  if (lower.includes('calendar') || lower.includes('sync') || lower.includes('available')) {
    return r.calendar || r.default;
  }
  if (lower.includes('bond') || lower.includes('calculation') || lower.includes('monthly payment') || lower.includes('repayment') || lower.includes('interest')) {
    return r.bond || r.default;
  }
  if (lower.includes('area') || lower.includes('neighborhood') || lower.includes('suburb') || lower.includes('where') || lower.includes('location') || lower.includes('fourways') || lower.includes('roodepoort') || lower.includes('sandton') || lower.includes('cape town')) {
    return r.area || r.default;
  }
  if (lower.includes('market') || lower.includes('trend') || lower.includes('growth') || lower.includes('2025') || lower.includes('2026') || lower.includes('outlook')) {
    return r.market || r.default;
  }
  if (lower.includes('invest') || lower.includes('rental') || lower.includes('yield') || lower.includes('landlord')) {
    return r.investment || r.default;
  }
  if (lower.includes('setup') || lower.includes('install') || lower.includes('start') || lower.includes('how do i') || lower.includes('onboard')) {
    return r.setup || r.default;
  }
  if (lower.includes('error') || lower.includes('bug') || lower.includes('broken') || lower.includes('not working') || lower.includes('issue') || lower.includes('problem')) {
    return r.technical || r.default;
  }
  if (lower.includes('compet') || lower.includes('other') || lower.includes('compare') || lower.includes('difference') || lower.includes('better')) {
    return r.competition || r.default;
  }
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('howzit') || lower.includes('how are you') || lower.includes('good morning') || lower.includes('good afternoon') || lower.includes('good day') || lower.includes('whats up') || lower.includes("what's up")) {
    return r.small_talk || agent.greeting;
  }

  // Context-aware fallback based on conversation history
  if (conversationHistory.length > 2) {
    const lastTopic = (conversationHistory[conversationHistory.length - 2] && conversationHistory[conversationHistory.length - 2].text) || '';
    if (lastTopic.includes('pricing') || lastTopic.includes('R1,499') || lastTopic.includes('R3,499')) {
      return "Would you like me to help you pick the right plan? Or is there something specific about the pricing you'd like me to clarify?";
    }
    if (lastTopic.includes('WhatsApp')) {
      return "Anything else about how the WhatsApp integration works? I can also connect you with Zinhle for booking questions or Jason for ROI questions!";
    }
  }

  return r.default;
}

// ─── Form handlers ────────────────────────────────────────────
async function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  const originalText = btn.textContent;
  btn.textContent = 'Sending...';
  btn.disabled = true;

  const formData = new FormData(form);
  formData.append('access_key', '51fe7591-f068-4c4a-a998-00e877c3e84d');

  try {
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData
    });
    const result = await response.json();
    if (result.success) {
      alert('Thanks! We\'ll be in touch within 24 hours to schedule your demo.');
      form.reset();
    } else {
      throw new Error(result.message || 'Submission failed');
    }
  } catch (err) {
    const name = encodeURIComponent(form.querySelector('input[type="text"]').value);
    const email = encodeURIComponent(form.querySelector('input[type="email"]').value);
    const phone = encodeURIComponent(form.querySelector('input[type="tel"]').value);
    const agency = encodeURIComponent((form.querySelectorAll('input[type="text"]')[1] && form.querySelectorAll('input[type="text"]')[1].value) || '');
    window.location.href = `mailto:Jordankafundawetou@gmail.com?subject=New Demo Booking - LMK&body=Name: ${name}%0AEmail: ${email}%0APhone: ${phone}%0AAgency: ${agency}`;
    alert('Opening your email client to send the booking...');
  }

  btn.textContent = originalText;
  btn.disabled = false;
}

function handleNewsletter(e) {
  e.preventDefault();
  alert('Subscribed! You\'ll receive updates on new features and exclusive offers.');
  e.target.reset();
}

// ─── Init ─────────────────────────────────────────────────────
function initReveal() {
  window.dispatchEvent(new Event('scroll'));
  // Re-observe all reveal elements (in case DOM wasn't ready when script loaded)
  document.querySelectorAll('.reveal-on-scroll:not(.revealed)').forEach(el => {
    revealObserver.observe(el);
  });
  // Start analytics
  initAnalytics();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initReveal);
} else {
  initReveal();
}

// Force reveal fallback for file:// protocol or observer failures
setTimeout(() => {
  document.querySelectorAll('.reveal-on-scroll:not(.revealed)').forEach(el => {
    el.classList.add('revealed');
  });
}, 500);
