const nodemailer = require('nodemailer');

// Email configuration
// For production, use environment variables for sensitive data
const EMAIL_CONFIG = {
  service: process.env.EMAIL_SERVICE || 'gmail', // gmail, outlook, yahoo, etc.
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASSWORD, // Your email password or app-specific password
  },
};

// Create reusable transporter
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
      console.warn('⚠️  Email not configured. Set EMAIL_USER and EMAIL_PASSWORD in .env file');
      return null;
    }

    transporter = nodemailer.createTransport({
      service: EMAIL_CONFIG.service,
      auth: EMAIL_CONFIG.auth,
    });
  }
  return transporter;
};

// Send password reset email
const sendPasswordResetEmail = async (to, resetToken) => {
  const transport = getTransporter();
  
  if (!transport) {
    console.error('Email transporter not configured');
    return false;
  }

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}?token=${resetToken}`;
  
  const mailOptions = {
    from: `"ChatGPT Clone" <${EMAIL_CONFIG.auth.user}>`,
    to: to,
    subject: 'Password Reset Request - ChatGPT Clone',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #202124;
            background-color: #f8f9fa;
            padding: 20px;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
          }
          .header {
            background: linear-gradient(135deg, #10a37f 0%, #0d8c6d 100%);
            padding: 40px 30px;
            text-align: center;
          }
          .logo {
            font-size: 32px;
            margin-bottom: 10px;
          }
          .header-title {
            color: #ffffff;
            font-size: 24px;
            font-weight: 600;
            margin: 0;
          }
          .content {
            padding: 40px 30px;
          }
          .greeting {
            font-size: 18px;
            font-weight: 500;
            color: #202124;
            margin-bottom: 20px;
          }
          .message {
            font-size: 16px;
            color: #5f6368;
            margin-bottom: 30px;
            line-height: 1.7;
          }
          .cta-container {
            text-align: center;
            margin: 35px 0;
          }
          .cta-button {
            display: inline-block;
            padding: 16px 40px;
            background: linear-gradient(135deg, #10a37f 0%, #0d8c6d 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(16, 163, 127, 0.3);
          }
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(16, 163, 127, 0.4);
          }
          .divider {
            text-align: center;
            margin: 30px 0;
            position: relative;
          }
          .divider::before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            width: 100%;
            height: 1px;
            background: #e8eaed;
          }
          .divider-text {
            background: #ffffff;
            padding: 0 15px;
            color: #5f6368;
            font-size: 14px;
            position: relative;
            display: inline-block;
          }
          .link-box {
            background-color: #f8f9fa;
            border: 1px solid #e8eaed;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
          }
          .link-text {
            color: #1a73e8;
            font-size: 13px;
            word-break: break-all;
            text-decoration: none;
          }
          .warning-box {
            background-color: #fef7e0;
            border-left: 4px solid #f9ab00;
            padding: 16px;
            margin: 25px 0;
            border-radius: 4px;
          }
          .warning-title {
            color: #b06000;
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 5px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .warning-text {
            color: #b06000;
            font-size: 14px;
            line-height: 1.5;
          }
          .security-note {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin-top: 30px;
          }
          .security-note p {
            font-size: 14px;
            color: #5f6368;
            margin: 0;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e8eaed;
          }
          .footer-text {
            font-size: 13px;
            color: #5f6368;
            margin: 5px 0;
          }
          .footer-logo {
            color: #80868b;
            font-size: 12px;
            margin-top: 15px;
          }
          @media only screen and (max-width: 600px) {
            .content {
              padding: 30px 20px;
            }
            .cta-button {
              padding: 14px 30px;
              font-size: 15px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <!-- Header -->
          <div class="header">
            <div class="logo">💬</div>
            <h1 class="header-title">Reset Your Password</h1>
          </div>

          <!-- Main Content -->
          <div class="content">
            <p class="greeting">Hello,</p>
            
            <p class="message">
              We received a request to reset the password for your ChatGPT Clone account. 
              To proceed with resetting your password, please click the button below:
            </p>

            <div class="cta-container">
              <a href="${resetUrl}" class="cta-button">Reset Password</a>
            </div>

            <div class="divider">
              <span class="divider-text">Or use this link</span>
            </div>

            <div class="link-box">
              <a href="${resetUrl}" class="link-text">${resetUrl}</a>
            </div>

            <div class="warning-box">
              <div class="warning-title">
                <span>⏰</span>
                <span>Time-Sensitive</span>
              </div>
              <p class="warning-text">
                This password reset link will expire in <strong>1 hour</strong> for your security.
              </p>
            </div>

            <div class="security-note">
              <p>
                <strong>Didn't request this?</strong><br>
                If you didn't request a password reset, you can safely ignore this email. 
                Your password will remain unchanged and your account is secure.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p class="footer-text">This is an automated message from ChatGPT Clone.</p>
            <p class="footer-text">Please do not reply to this email.</p>
            <p class="footer-logo">© 2025 ChatGPT Clone. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
RESET YOUR PASSWORD

Hello,

We received a request to reset the password for your ChatGPT Clone account.

To proceed with resetting your password, please copy and paste this link into your browser:

${resetUrl}

⏰ TIME-SENSITIVE: This password reset link will expire in 1 hour for your security.

DIDN'T REQUEST THIS?
If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged and your account is secure.

---
This is an automated message from ChatGPT Clone.
Please do not reply to this email.

© 2025 ChatGPT Clone. All rights reserved.
    `,
  };

  try {
    const info = await transport.sendMail(mailOptions);
    console.log('✓ Password reset email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('✗ Failed to send password reset email:', error);
    return false;
  }
};

// Test email configuration
const testEmailConnection = async () => {
  const transport = getTransporter();
  
  if (!transport) {
    return false;
  }

  try {
    await transport.verify();
    console.log('✓ Email server is ready to send messages');
    return true;
  } catch (error) {
    console.error('✗ Email server connection failed:', error.message);
    return false;
  }
};

module.exports = {
  sendPasswordResetEmail,
  testEmailConnection,
};
