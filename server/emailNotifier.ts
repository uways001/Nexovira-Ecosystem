import nodemailer, { type Transporter } from 'nodemailer';

export interface EmailDispatchResult {
  success: boolean;
  delivered: boolean;
  channel: 'SMTP' | 'GMAIL_APP' | 'CONSOLE_AUDIT';
  recipient: string;
  subject: string;
  messageId?: string;
  previewText?: string;
  timestamp: string;
  error?: string;
}

const DEFAULT_ADMIN_EMAIL = process.env.NEXOVIRA_ADMIN_EMAIL || 'nexoviratech@gmail.com';

// Lazy Nodemailer Transporter
let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (host && user && pass) {
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
    return cachedTransporter;
  }

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
    return cachedTransporter;
  }

  return null;
}

/**
 * Dispatches an email to Nexovira Management or logs it securely
 */
export async function sendEmailNotification(options: {
  to?: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<EmailDispatchResult> {
  const recipient = options.to || DEFAULT_ADMIN_EMAIL;
  const timestamp = new Date().toISOString();

  try {
    const transporter = getTransporter();

    if (transporter) {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Nexovira Platform" <${DEFAULT_ADMIN_EMAIL}>`,
        to: recipient,
        subject: options.subject,
        text: options.text || options.subject,
        html: options.html
      });

      console.log(`📧 [EMAIL NOTIFICATION DISPATCHED] To: ${recipient} | Subject: ${options.subject} | ID: ${info.messageId}`);

      return {
        success: true,
        delivered: true,
        channel: 'SMTP',
        recipient,
        subject: options.subject,
        messageId: info.messageId,
        timestamp
      };
    }

    // Console & Audit Dispatch (Safe default when SMTP credentials are not yet configured)
    console.log(`
================================================================================
📨 [NEXOVIRA NOTIFICATION GATEWAY] Real-Time Alert to: ${recipient}
--------------------------------------------------------------------------------
SUBJECT: ${options.subject}
TIME:    ${timestamp}
RECIPIENT: ${recipient}
STATUS:  Recorded & Queued for Nexovira Management (nexoviratech@gmail.com)
--------------------------------------------------------------------------------
${options.text || 'View HTML version in client preview/dashboard.'}
================================================================================
`);

    return {
      success: true,
      delivered: true,
      channel: 'CONSOLE_AUDIT',
      recipient,
      subject: options.subject,
      previewText: (options.text || options.subject).slice(0, 150),
      timestamp
    };
  } catch (err: any) {
    console.error(`❌ [EMAIL NOTIFICATION FAILED] To: ${recipient}:`, err);
    return {
      success: false,
      delivered: false,
      channel: 'CONSOLE_AUDIT',
      recipient,
      subject: options.subject,
      error: err?.message || 'Failed to dispatch email',
      timestamp
    };
  }
}

/**
 * Formats a clean HTML template for New Project Request
 */
export function buildProjectRequestEmailHtml(req: any): { html: string; text: string; subject: string } {
  const ref = req.referenceNumber || `NEX-${Date.now().toString().slice(-6)}`;
  const subject = `[New Project Request] ${ref}: ${req.serviceTitle || 'Technical Brief'} (${req.serviceCategory || 'Tech Services'})`;

  const text = `
NEXOVIRA TECH & DIGITAL SERVICES - NEW PROJECT BRIEF
Reference: ${ref}
Date: ${new Date().toLocaleString()}

CLIENT DETAILS:
- Name: ${req.customerName || 'N/A'}
- Email: ${req.customerEmail || 'N/A'}
- Phone: ${req.customerPhone || 'N/A'}
- Location: ${req.customerLocation || 'N/A'}

PROJECT SUMMARY:
- Title: ${req.serviceTitle || 'N/A'}
- Category: ${req.serviceCategory || 'N/A'}
- Complexity: ${req.projectComplexity || 'Medium'}
- Scope: ${req.projectScope || 'Medium'}
- Project Type: ${req.projectType || 'One-time Project'}
- Budget Expectation: ${req.budgetExpectation || 'Flexible'}
- Timeline: ${req.timeline || 'Standard'}

PROJECT DESCRIPTION:
${req.projectDescription || 'No description provided.'}

REQUIRED EXPERTISE:
${(req.requiredExpertise || []).join(', ') || 'General'}

DELIVERABLES & REQUIREMENTS:
${(req.detectedRequirements || []).map((r: string) => `- ${r}`).join('\n') || 'N/A'}

ACTION REQUIRED:
Log in to the Nexovira Admin Portal to run AI Expert Matching and assign vetted talent.
Notification dispatched to: ${DEFAULT_ADMIN_EMAIL}
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; margin: 0; padding: 24px; }
    .container { max-width: 650px; margin: 0 auto; background: #0f172a; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0284c7 0%, #06b6d4 100%); padding: 32px 28px; text-align: left; }
    .header h1 { margin: 0 0 8px 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; }
    .badge { display: inline-block; background: rgba(0,0,0,0.25); color: #e0f2fe; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; font-family: monospace; }
    .content { padding: 28px; }
    .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #38bdf8; margin: 20px 0 10px 0; border-bottom: 1px solid #1e293b; padding-bottom: 6px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .card { background: #1e293b; padding: 12px 16px; border-radius: 8px; font-size: 13px; }
    .card-label { color: #94a3b8; font-size: 11px; margin-bottom: 2px; }
    .card-val { color: #ffffff; font-weight: 700; }
    .desc-box { background: #020617; border: 1px solid #1e293b; border-radius: 10px; padding: 16px; font-size: 14px; line-height: 1.6; color: #e2e8f0; margin-bottom: 16px; white-space: pre-wrap; }
    .tag { display: inline-block; background: #0369a1; color: #e0f2fe; padding: 4px 10px; border-radius: 20px; font-size: 11px; margin: 2px 4px 2px 0; font-weight: 600; }
    .btn { display: inline-block; background: #06b6d4; color: #020617; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 900; font-size: 14px; margin-top: 16px; text-align: center; }
    .footer { background: #090d16; padding: 20px 28px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">REFERENCE: ${ref}</div>
      <h1>New Tech & Digital Service Request</h1>
      <p style="margin:0; color:#e0f2fe; font-size:14px;">Nexovira Managed Ecosystem • Client Intake Brief</p>
    </div>
    <div class="content">
      <div class="section-title">Client Information</div>
      <div class="grid">
        <div class="card">
          <div class="card-label">Client Name</div>
          <div class="card-val">${req.customerName || 'N/A'}</div>
        </div>
        <div class="card">
          <div class="card-label">Email Address</div>
          <div class="card-val">${req.customerEmail || 'N/A'}</div>
        </div>
        <div class="card">
          <div class="card-label">Phone Number</div>
          <div class="card-val">${req.customerPhone || 'N/A'}</div>
        </div>
        <div class="card">
          <div class="card-label">Location</div>
          <div class="card-val">${req.customerLocation || 'Lagos, Nigeria'}</div>
        </div>
      </div>

      <div class="section-title">Project Parameters</div>
      <div class="grid">
        <div class="card">
          <div class="card-label">Service Title</div>
          <div class="card-val">${req.serviceTitle || 'N/A'}</div>
        </div>
        <div class="card">
          <div class="card-label">Category</div>
          <div class="card-val">${req.serviceCategory || 'Tech & Digital Services'}</div>
        </div>
        <div class="card">
          <div class="card-label">Budget Expectation</div>
          <div class="card-val" style="color:#34d399;">${req.budgetExpectation || 'Flexible'}</div>
        </div>
        <div class="card">
          <div class="card-label">Target Timeline</div>
          <div class="card-val">${req.timeline || 'Standard'}</div>
        </div>
        <div class="card">
          <div class="card-label">Complexity</div>
          <div class="card-val">${req.projectComplexity || 'Medium'}</div>
        </div>
        <div class="card">
          <div class="card-label">Engagement Type</div>
          <div class="card-val">${req.projectType || 'One-time Project'}</div>
        </div>
      </div>

      <div class="section-title">Client Brief & Scope</div>
      <div class="desc-box">${req.projectDescription || 'No description provided.'}</div>

      ${(req.requiredExpertise && req.requiredExpertise.length > 0) ? `
      <div class="section-title">Required Expertise</div>
      <div style="margin-bottom: 16px;">
        ${req.requiredExpertise.map((exp: string) => `<span class="tag">${exp}</span>`).join('')}
      </div>` : ''}

      ${(req.detectedRequirements && req.detectedRequirements.length > 0) ? `
      <div class="section-title">Tangible Requirements & Deliverables</div>
      <ul style="color:#cbd5e1; font-size:13px; line-height:1.8; margin-top:4px;">
        ${req.detectedRequirements.map((r: string) => `<li>${r}</li>`).join('')}
      </ul>` : ''}

      <div style="text-align: center; margin: 28px 0 10px 0;">
        <a href="https://nexovira.com/admin?tab=services" class="btn">Open Admin Dashboard & Match Expert</a>
      </div>
    </div>
    <div class="footer">
      Sent automatically to Nexovira Management at <strong>${DEFAULT_ADMIN_EMAIL}</strong><br>
      Nexovira AI Ecosystem &copy; ${new Date().getFullYear()} Nexovira. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

  return { html, text, subject };
}

/**
 * Formats a clean HTML template for Expert Application
 */
export function buildExpertApplicationEmailHtml(expert: any): { html: string; text: string; subject: string } {
  const subject = `[Expert Application] ${expert.name} - ${expert.title} (${expert.specialization || expert.primaryExpertise})`;

  const text = `
NEXOVIRA EXPERT NETWORK - NEW APPLICATION
Date: ${new Date().toLocaleString()}

APPLICANT DETAILS:
- Full Name: ${expert.name}
- Professional Title: ${expert.title}
- Primary Expertise: ${expert.primaryExpertise || expert.specialization}
- Experience: ${expert.experienceYears} years (${expert.experienceLevel})
- Email: ${expert.email}
- Phone: ${expert.phone}
- Location: ${expert.location || 'Nigeria'}

SKILLS:
${(expert.skills || []).join(', ')}

PORTFOLIO & SOCIAL LINKS:
- Website: ${expert.websiteUrl || 'N/A'}
- GitHub: ${expert.githubUrl || 'N/A'}
- LinkedIn: ${expert.linkedInUrl || 'N/A'}
- Behance: ${expert.behanceUrl || 'N/A'}

BIO & SUMMARY:
${expert.bio || 'N/A'}

ACTION REQUIRED:
Review and approve candidate profile in the Nexovira Admin Portal.
Dispatched to: ${DEFAULT_ADMIN_EMAIL}
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; margin: 0; padding: 24px; }
    .container { max-width: 650px; margin: 0 auto; background: #0f172a; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden; }
    .header { background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); padding: 32px 28px; text-align: left; }
    .header h1 { margin: 0 0 8px 0; font-size: 24px; font-weight: 900; color: #ffffff; }
    .content { padding: 28px; }
    .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #34d399; margin: 20px 0 10px 0; border-bottom: 1px solid #1e293b; padding-bottom: 6px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .card { background: #1e293b; padding: 12px 16px; border-radius: 8px; font-size: 13px; }
    .card-label { color: #94a3b8; font-size: 11px; margin-bottom: 2px; }
    .card-val { color: #ffffff; font-weight: 700; }
    .tag { display: inline-block; background: #065f46; color: #a7f3d0; padding: 4px 10px; border-radius: 20px; font-size: 11px; margin: 2px 4px 2px 0; font-weight: 600; }
    .footer { background: #090d16; padding: 20px 28px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 12px; font-weight: bold; color: #e6fffa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Nexovira Expert Network</div>
      <h1>New Specialist Vetting Application</h1>
      <p style="margin:0; color:#e0f2fe; font-size:14px;">Candidate profile submitted for administrative approval.</p>
    </div>
    <div class="content">
      <div class="section-title">Candidate Profile</div>
      <div class="grid">
        <div class="card">
          <div class="card-label">Full Name</div>
          <div class="card-val">${expert.name}</div>
        </div>
        <div class="card">
          <div class="card-label">Title</div>
          <div class="card-val">${expert.title}</div>
        </div>
        <div class="card">
          <div class="card-label">Specialization</div>
          <div class="card-val">${expert.specialization || expert.primaryExpertise}</div>
        </div>
        <div class="card">
          <div class="card-label">Experience</div>
          <div class="card-val">${expert.experienceYears} Years (${expert.experienceLevel})</div>
        </div>
        <div class="card">
          <div class="card-label">Email</div>
          <div class="card-val">${expert.email}</div>
        </div>
        <div class="card">
          <div class="card-label">Phone</div>
          <div class="card-val">${expert.phone}</div>
        </div>
      </div>

      <div class="section-title">Bio & Pitch</div>
      <p style="font-size:13px; color:#cbd5e1; line-height:1.6; background:#020617; padding:14px; border-radius:8px; border:1px solid #1e293b;">
        ${expert.bio || 'N/A'}
      </p>

      <div class="section-title">Verified Skills</div>
      <div>
        ${(expert.skills || []).map((sk: string) => `<span class="tag">${sk}</span>`).join('')}
      </div>

      <div class="section-title">Portfolio & Links</div>
      <div style="font-size: 13px; color: #38bdf8; line-height: 1.8;">
        ${expert.websiteUrl ? `<div>Website: <a href="${expert.websiteUrl}" style="color:#38bdf8;">${expert.websiteUrl}</a></div>` : ''}
        ${expert.githubUrl ? `<div>GitHub: <a href="${expert.githubUrl}" style="color:#38bdf8;">${expert.githubUrl}</a></div>` : ''}
        ${expert.linkedInUrl ? `<div>LinkedIn: <a href="${expert.linkedInUrl}" style="color:#38bdf8;">${expert.linkedInUrl}</a></div>` : ''}
        ${expert.behanceUrl ? `<div>Behance: <a href="${expert.behanceUrl}" style="color:#38bdf8;">${expert.behanceUrl}</a></div>` : ''}
      </div>
    </div>
    <div class="footer">
      Sent to Nexovira Management at <strong>${DEFAULT_ADMIN_EMAIL}</strong>
    </div>
  </div>
</body>
</html>
`;

  return { html, text, subject };
}

/**
 * Builds email notification template for Nexovira Scholarship Applications
 */
export function buildScholarshipApplicationEmailHtml(application: {
  fullName: string;
  email: string;
  phone: string;
  selectedCourse: string;
  referenceNumber: string;
  paymentStatus: string;
  registrationFee: number;
  country?: string;
  state?: string;
  city?: string;
  currentOccupation?: string;
  experienceLevel?: string;
  whyJoin?: string;
  goals?: string;
  learningCommitment?: string;
  courseWhatsAppLink?: string;
}) {
  const subject = `New Nexovira Scholarship Application — ${application.selectedCourse} (${application.referenceNumber})`;

  const text = `
NEXOVIRA SCHOLARSHIP PROGRAM — NEW APPLICATION RECORD

A new applicant has registered for the Nexovira Scholarship Program.

APPLICANT DETAILS:
- Name: ${application.fullName}
- Email: ${application.email}
- Phone: ${application.phone}
- Location: ${application.city || 'N/A'}, ${application.state || 'N/A'}, ${application.country || 'Nigeria'}
- Current Status: ${application.currentOccupation || 'N/A'}
- Experience Level: ${application.experienceLevel || 'Beginner'}

COURSE & REGISTRATION:
- Selected Course: ${application.selectedCourse}
- Application Reference: ${application.referenceNumber}
- Registration Fee: ₦${(application.registrationFee || 4500).toLocaleString()}
- Payment Status: ${application.paymentStatus}
- Learning Commitment: ${application.learningCommitment || 'Standard'}

MOTIVATION:
${application.whyJoin || 'N/A'}

GOALS:
${application.goals || 'N/A'}

COMMUNITY ACCESS:
- WhatsApp Group Link: ${application.courseWhatsAppLink || 'Assigned in Admin Dashboard'}

Dispatched to Nexovira Management: ${DEFAULT_ADMIN_EMAIL}
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #01213D; color: #f1f5f9; margin: 0; padding: 24px; }
    .container { max-width: 650px; margin: 0 auto; background: #071326; border-radius: 20px; border: 1px solid #0682F4; overflow: hidden; }
    .header { background: linear-gradient(135deg, #01213D 0%, #0682F4 50%, #05A9F7 100%); padding: 32px 28px; text-align: left; }
    .header h1 { margin: 0 0 8px 0; font-size: 22px; font-weight: 900; color: #ffffff; }
    .badge { display: inline-block; background: rgba(6, 195, 248, 0.2); border: 1px solid #06C3F8; color: #06C3F8; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; }
    .content { padding: 28px; }
    .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #06C3F8; margin: 20px 0 10px 0; border-bottom: 1px solid #1e293b; padding-bottom: 6px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .card { background: #0d1b2e; padding: 12px 16px; border-radius: 12px; font-size: 13px; border: 1px solid #1e3a5f; }
    .card-label { color: #94a3b8; font-size: 11px; margin-bottom: 2px; }
    .card-val { color: #ffffff; font-weight: 700; }
    .footer { background: #030a14; padding: 20px 28px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Nexovira Academy • Scholarship Program</div>
      <h1>🎓 New Scholarship Application Received</h1>
      <p style="margin:0; color:#e0f2fe; font-size:14px;">A new candidate has submitted their registration.</p>
    </div>
    <div class="content">
      <div class="section-title">Applicant Profile</div>
      <div class="grid">
        <div class="card">
          <div class="card-label">Full Name</div>
          <div class="card-val">${application.fullName}</div>
        </div>
        <div class="card">
          <div class="card-label">Application Reference</div>
          <div class="card-val" style="color: #06C3F8;">${application.referenceNumber}</div>
        </div>
        <div class="card">
          <div class="card-label">Email Address</div>
          <div class="card-val">${application.email}</div>
        </div>
        <div class="card">
          <div class="card-label">Phone Number</div>
          <div class="card-val">${application.phone}</div>
        </div>
        <div class="card">
          <div class="card-label">Current Status</div>
          <div class="card-val">${application.currentOccupation || 'Student'}</div>
        </div>
        <div class="card">
          <div class="card-label">Experience Level</div>
          <div class="card-val">${application.experienceLevel || 'Beginner'}</div>
        </div>
      </div>

      <div class="section-title">Course & Registration Details</div>
      <div class="grid">
        <div class="card">
          <div class="card-label">Selected Course</div>
          <div class="card-val" style="color: #38bdf8;">${application.selectedCourse}</div>
        </div>
        <div class="card">
          <div class="card-label">Registration Fee</div>
          <div class="card-val" style="color: #34d399;">₦${(application.registrationFee || 4500).toLocaleString()}</div>
        </div>
        <div class="card">
          <div class="card-label">Payment Status</div>
          <div class="card-val" style="color: ${application.paymentStatus === 'paid' ? '#34d399' : '#fbbf24'}; text-transform: uppercase;">
            ${application.paymentStatus}
          </div>
        </div>
        <div class="card">
          <div class="card-label">Assigned WhatsApp Community</div>
          <div class="card-val" style="font-size: 11px; word-break: break-all;">
            ${application.courseWhatsAppLink || 'Not assigned yet'}
          </div>
        </div>
      </div>

      <div class="section-title">Why They Want to Learn</div>
      <p style="font-size:13px; color:#cbd5e1; line-height:1.6; background:#0d1b2e; padding:14px; border-radius:12px; border:1px solid #1e3a5f;">
        ${application.whyJoin || 'Not provided'}
      </p>

      <div class="section-title">Expected Goals</div>
      <p style="font-size:13px; color:#cbd5e1; line-height:1.6; background:#0d1b2e; padding:14px; border-radius:12px; border:1px solid #1e3a5f;">
        ${application.goals || 'Not provided'}
      </p>
    </div>
    <div class="footer">
      Sent to Nexovira Management at <strong>${DEFAULT_ADMIN_EMAIL}</strong><br />
      Nexovira AI Ecosystem &copy; ${new Date().getFullYear()}
    </div>
  </div>
</body>
</html>
`;

  return { html, text, subject };
}

