import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Base email template with Graxion branding
 */
const emailTemplate = (title, content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 560px; margin: 40px auto; background: #12121a; border-radius: 16px; border: 1px solid rgba(139, 92, 246, 0.15); overflow: hidden; }
    .header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%); padding: 32px; text-align: center; }
    .header h1 { color: #fff; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.85); font-size: 14px; margin: 8px 0 0; }
    .body { padding: 32px; }
    .body p { color: #a1a1aa; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
    .body .highlight { color: #e4e4e7; font-weight: 600; }
    .btn { display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; margin: 16px 0; }
    .btn:hover { opacity: 0.9; }
    .code-box { background: #1a1a2e; border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 10px; padding: 20px; text-align: center; margin: 16px 0; }
    .code-box .code { color: #a855f7; font-size: 32px; font-weight: 700; letter-spacing: 6px; font-family: 'Courier New', monospace; }
    .divider { height: 1px; background: rgba(139, 92, 246, 0.15); margin: 24px 0; }
    .footer { padding: 24px 32px; text-align: center; border-top: 1px solid rgba(139, 92, 246, 0.1); }
    .footer p { color: #52525b; font-size: 12px; margin: 0; }
    .footer a { color: #7c3aed; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Graxion</h1>
      <p>${title}</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Graxion. All rights reserved.</p>
      <p style="margin-top: 8px;"><a href="https://graxion.in">graxion.in</a></p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Send Welcome Email
 */
export const sendWelcomeEmail = async (email, firstName) => {
  const content = `
    <p>Hi <span class="highlight">${firstName}</span>,</p>
    <p>Welcome to Graxion! Your account has been created successfully.</p>
    <p>You now have access to the entire Graxion ecosystem — Flow, AI, Mail, and more.</p>
    <div class="divider"></div>
    <p>Get started by exploring your dashboard and linking your favorite products.</p>
    <a href="${process.env.CLIENT_URL}/profile" class="btn">Go to Dashboard →</a>
    <div class="divider"></div>
    <p style="font-size: 13px; color: #71717a;">If you didn't create this account, please ignore this email or contact our support team.</p>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Graxion <accounts@graxion.in>',
      to: [email],
      subject: 'Welcome to Graxion! 🚀',
      html: emailTemplate('Welcome to Graxion', content),
    });

    if (error) {
      console.error('❌ Email send error:', error);
      return;
    }
    console.log(`📧 Welcome email sent to ${email}`, data);
  } catch (err) {
    console.error('❌ Email send exception:', err.message);
  }
};

/**
 * Send Email Verification
 */
export const sendVerificationEmail = async (email, firstName, token) => {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;
  
  const content = `
    <p>Hi <span class="highlight">${firstName}</span>,</p>
    <p>Please verify your email address to complete your Graxion account setup.</p>
    <p style="text-align: center;">
      <a href="${verifyUrl}" class="btn">Verify Email Address</a>
    </p>
    <div class="divider"></div>
    <p style="font-size: 13px; color: #71717a;">This link will expire in 24 hours. If you didn't request this, please ignore this email.</p>
    <p style="font-size: 12px; color: #52525b;">Or copy this link: ${verifyUrl}</p>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Graxion <accounts@graxion.in>',
      to: [email],
      subject: 'Verify your Graxion Account ✉️',
      html: emailTemplate('Email Verification', content),
    });

    if (error) {
      console.error('❌ Verification email error:', error);
      return;
    }
    console.log(`📧 Verification email sent to ${email}`, data);
  } catch (err) {
    console.error('❌ Verification email exception:', err.message);
  }
};

/**
 * Send Password Reset Email
 */
export const sendPasswordResetEmail = async (email, firstName, token) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;
  
  const content = `
    <p>Hi <span class="highlight">${firstName}</span>,</p>
    <p>We received a request to reset your Graxion account password.</p>
    <p style="text-align: center;">
      <a href="${resetUrl}" class="btn">Reset Password</a>
    </p>
    <div class="divider"></div>
    <p style="font-size: 13px; color: #71717a;">This link will expire in 1 hour. If you didn't request this, your account is safe — you can ignore this email.</p>
    <p style="font-size: 12px; color: #52525b;">Or copy this link: ${resetUrl}</p>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Graxion <accounts@graxion.in>',
      to: [email],
      subject: 'Reset your Graxion Password 🔒',
      html: emailTemplate('Password Reset', content),
    });

    if (error) {
      console.error('❌ Password reset email error:', error);
      return;
    }
    console.log(`📧 Password reset email sent to ${email}`, data);
  } catch (err) {
    console.error('❌ Password reset email exception:', err.message);
  }
};
