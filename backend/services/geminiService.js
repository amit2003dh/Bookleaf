const { GoogleGenerativeAI } = require('@google/generative-ai');

// Helper to safely format dates from either Mongoose (Date object) or JSON DB (string)
const formatDate = (date) => {
  if (!date) return 'None';
  try {
    if (typeof date === 'string') {
      return date.split('T')[0];
    }
    if (typeof date.toISOString === 'function') {
      return date.toISOString().split('T')[0];
    }
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? String(date) : parsed.toISOString().split('T')[0];
  } catch (error) {
    return String(date);
  }
};

// Initialize Gemini API client if API key is present
const getGenAIModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    console.warn('Gemini Service: GEMINI_API_KEY is not configured. Falling back to default heuristics.');
    return null;
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  } catch (error) {
    console.error('Gemini Service: Failed to initialize GoogleGenerativeAI', error);
    return null;
  }
};

/**
 * Automatically classifies a ticket category and priority.
 * Fallbacks to General Inquiry and Medium priority on failure.
 */
const classifyAndPrioritize = async (subject, description) => {
  const model = getGenAIModel();
  if (!model) {
    return {
      category: 'General Inquiry',
      priority: 'Medium',
    };
  }

  const prompt = `
Analyze the subject and description of the support ticket raised by an author below:
Subject: "${subject}"
Description: "${description}"

Categorize this support ticket into EXACTLY one of these categories:
- Royalty & Payments (use for questions about missing payments, low earnings, payout cycles)
- ISBN & Metadata Issues (use for wrong ISBN on physical copy, duplicate ISBN, or retail platform discrepancies)
- Printing & Quality (use for misprints, blurry text, binding issues, copy turnaround times)
- Distribution & Availability (use for books showing "unavailable" on Amazon/Flipkart, stock sync, or store listing requests)
- Book Status & Production Updates (use for checking book stages like cover design, editing, typesetting, proofreading)
- General Inquiry (use for updating bios, account level questions, or general self-publishing packages)

Assign one of the following priority levels:
- Critical (e.g., duplicate/incorrect ISBN on live platforms, completely incorrect royalties paid, severe production errors)
- High (e.g., book showing as unavailable on main platforms, print quality defects in client order copies, delayed quarterly royalty payout)
- Medium (e.g., normal delay updates, stock sync requests, general royalties timeline queries)
- Low (e.g., updating author bio, query about self-publishing packages, generic inquiries)

You MUST respond ONLY with a JSON object. Do not include markdown code block formats (like \`\`\`json) or conversational text. Return exactly this format:
{
  "category": "Selected Category",
  "priority": "Critical/High/Medium/Low"
}
`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const text = result.response.text();
    let cleanText = text.trim();
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(cleanText);
    const validCategories = [
      'Royalty & Payments',
      'ISBN & Metadata Issues',
      'Printing & Quality',
      'Distribution & Availability',
      'Book Status & Production Updates',
      'General Inquiry',
    ];
    const validPriorities = ['Critical', 'High', 'Medium', 'Low'];

    return {
      category: validCategories.includes(parsed.category) ? parsed.category : 'General Inquiry',
      priority: validPriorities.includes(parsed.priority) ? parsed.priority : 'Medium',
    };
  } catch (error) {
    console.error('Gemini Classification Error (degrading gracefully):', error);
    // Simple heuristic fallback
    let category = 'General Inquiry';
    let priority = 'Medium';

    const textToCheck = `${subject} ${description}`.toLowerCase();
    if (textToCheck.includes('royalty') || textToCheck.includes('payment') || textToCheck.includes('paid') || textToCheck.includes('earning') || textToCheck.includes('money')) {
      category = 'Royalty & Payments';
      if (textToCheck.includes('never') || textToCheck.includes('6 months') || textToCheck.includes('not received')) {
        priority = 'High';
      }
    } else if (textToCheck.includes('isbn')) {
      category = 'ISBN & Metadata Issues';
      priority = 'High';
    } else if (textToCheck.includes('print') || textToCheck.includes('quality') || textToCheck.includes('blurry') || textToCheck.includes('pages')) {
      category = 'Printing & Quality';
    } else if (textToCheck.includes('unavailable') || textToCheck.includes('stock') || textToCheck.includes('amazon') || textToCheck.includes('flipkart')) {
      category = 'Distribution & Availability';
      priority = 'High';
    } else if (textToCheck.includes('production') || textToCheck.includes('stage') || textToCheck.includes('status') || textToCheck.includes('typesetting') || textToCheck.includes('proofread')) {
      category = 'Book Status & Production Updates';
    }

    return { category, priority };
  }
};

/**
 * Generates an AI-drafted reply based on the BookLeaf Knowledge Base
 * and the specific context of the author, ticket, and reference book.
 */
const generateDraftResponse = async (ticket, book, authorName) => {
  const model = getGenAIModel();
  if (!model) {
    return 'Dear Author,\n\nThank you for reaching out to BookLeaf Publishing. An administrator has received your ticket and will review it shortly to provide a customized response.\n\nBest Regards,\nBookLeaf Support Team';
  }

  // Define the knowledge base context
  const knowledgeBase = `
BOOKLEAF PUBLISHING KNOWLEDGE BASE & POLICIES
Company Overview:
- BookLeaf Publishing is a self-publishing company operating in India and the US.
- Packages: Standard Free (no upfront cost) and Bestseller Breakthrough (premium, paid package with marketing and distribution add-ons).
- Services: cover design, typesetting, ISBN assignment, printing, distribution, and royalty management.
- In-house printing facility and warehouse are in Delhi. Print partners include Repro India and Epitome Books.

Royalty Policy:
- 80/20 split: 80% of net profit per book goes to author, 20% to BookLeaf.
- Net profit = MRP minus (printing cost + platform commission like Amazon/Flipkart + shipping).
- Royalty calculation: quarterly, paid within 45 days of the quarter ending.
- Minimum payout threshold: ₹1,000. Under ₹1,000 rolls over to next quarter.
- Payout method: bank transfer to linked account in dashboard.
- Detailed royalty breakdown is viewable on the author dashboard.

ISBN Policy:
- Unique ISBN assigned by BookLeaf under BookLeaf's publisher imprint.
- If author wants their own imprint ISBN, they must obtain it independently.
- ISBN errors (duplicate, incorrect links) are Critical and escalated immediately to the production team (48-hour resolution timeline).

Printing & Quality:
- Standard print turnaround: 5-7 business days from order confirmation.
- Quality issues (misprints, blurry images, binding defects): BookLeaf arranges a free reprint after photo verification. Turnaround: 5-7 business days.

Distribution & Availability:
- Distribution: Amazon India, Flipkart, Amazon US, Amazon UK, and BookLeaf Store.
- New listings go live within 7-10 business days after publication is complete.
- "Currently Unavailable" stock sync issues: support can trigger a stock re-sync within 24-48 hours.

Production Stages:
- Manuscript Received → Editing (if opted) → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live.
- Authors updated via email at each stage. Delays usually happen at Cover Design (waiting for approval) and Proofreading (revisions).

Communication Tone Guidelines:
- Empathetic and professional. Acknowledge frustration/concern first.
- Be specific: use actual numbers, dates, statuses from the provided book context where possible.
- Own mistakes directly (no corporate deflection).
- Provide clear timelines (e.g., 48 hours, 24-48 hours, 5-7 business days).
- End with a clear next step.
`;

  let bookContext = 'No specific book referenced.';
  if (book) {
    bookContext = `
Book Title: "${book.title}"
ISBN: ${book.isbn || 'Pending'}
Status: ${book.status}
Genre: ${book.genre}
MRP: ₹${book.mrp || 0}
Total Copies Sold: ${book.totalCopiesSold}
Total Royalty Earned: ₹${book.totalRoyaltyEarned}
Royalty Paid: ₹${book.royaltyPaid}
Royalty Pending: ₹${book.royaltyPending}
Last Royalty Payout Date: ${formatDate(book.lastRoyaltyPayoutDate)}
Print Partner: ${book.printPartner || 'None'}
Available On: ${book.availableOn ? book.availableOn.join(', ') : 'None'}
`;
  }

  const prompt = `
You are an expert customer support agent at BookLeaf Publishing.
Your task is to draft a reply to an author support query based on the Company Knowledge Base and the provided ticket/book context.

Context details:
- Author Name: ${authorName}
- Ticket Subject: "${ticket.subject}"
- Ticket Category: "${ticket.category}"
- Ticket Priority: "${ticket.priority}"
- Ticket Description:
"""
${ticket.description}
"""

${book ? `Associated Book Details:\n${bookContext}\n` : ''}

Knowledge Base Context:
${knowledgeBase}

Draft a response following these rules:
1. Start with a direct, empathetic greeting to the author (e.g., "Dear ${authorName},").
2. Acknowledge their concern clearly and professionally.
3. Reference the specific facts/figures of their book (e.g., if asking about low royalties, explain the net profit calculation and mention their exact total sales, royalty earned, paid, and pending; if asking about production, mention their current stage).
4. Provide specific timelines based on BookLeaf policies (e.g., 24-48 hours for stock sync, 5-7 days for reprints, 45 days after quarter end for royalties).
5. Own errors if they are BookLeaf's fault (e.g., ISBN errors).
6. End with a clear next step and a professional sign-off.
7. Return ONLY the drafted email body text. Do not add any intros, notes, instructions, or wrappers.
`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    return result.response.text().trim();
  } catch (error) {
    console.error('Gemini Response Draft Error:', error);
    return `Dear ${authorName},\n\nThank you for raising this issue. We have received your query regarding "${ticket.subject}" (Category: ${ticket.category}). Our team is currently investigating the details and we will get back to you with a complete update within 24 to 48 hours.\n\nBest Regards,\nBookLeaf Support Team`;
  }
};

module.exports = {
  classifyAndPrioritize,
  generateDraftResponse,
};
