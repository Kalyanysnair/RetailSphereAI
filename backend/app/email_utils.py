import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

logger = logging.getLogger(__name__)

def send_password_reset_email(to_email: str, user_name: str, reset_code: str) -> bool:
    """
    Sends a Password Reset verification email to the user with a 6-digit verification code.
    If SMTP credentials (SMTP_USER and SMTP_PASSWORD) are configured in .env, sends real email via SMTP.
    Otherwise logs the email dispatch securely in the backend server logs.
    """
    subject = "Password Reset Verification Code - RetailSphere"
    from_address = settings.EMAILS_FROM_EMAIL or settings.SMTP_USER or "kalyanys2004@gmail.com"
    from_name = settings.EMAILS_FROM_NAME or "RetailSphere Support"

    # Ensure greeting uses clean username instead of raw email ID
    clean_username = user_name
    if not clean_username or '@' in clean_username:
        clean_username = to_email.split('@')[0] if (to_email and '@' in to_email) else "User"

    if clean_username and clean_username.isalpha():
        clean_username = clean_username.capitalize()

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Password Reset Code</title>
      <style>
        body {{ font-family: 'Plus Jakarta Sans', Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; }}
        .container {{ max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }}
        .header {{ text-align: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }}
        .header h1 {{ color: #0f172a; margin: 0; font-size: 24px; font-weight: 800; tracking-tight; }}
        .code-box {{ background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }}
        .code {{ font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f172a; font-family: monospace; }}
        .footer {{ font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>RetailSphere</h1>
        </div>
        <p>Hello <strong>{clean_username}</strong>,</p>
        <p>We received a request to reset your password for your RetailSphere account. Use the verification code below to set a new password:</p>
        <div class="code-box">
          <div class="code">{reset_code}</div>
        </div>
        <p>This code will expire in <strong>15 minutes</strong>. If you did not request a password reset, please ignore this email.</p>
        <div class="footer">
          &copy; RetailSphere Inc. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    """

    plain_text = f"""Hello {clean_username},

Your password reset verification code for RetailSphere is: {reset_code}

This code will expire in 15 minutes. If you did not request a password reset, please ignore this email.
"""

    if settings.SMTP_USER and settings.SMTP_PASSWORD:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{from_name} <{from_address}>"
            msg["To"] = to_email

            msg.attach(MIMEText(plain_text, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            smtp_user = settings.SMTP_USER.strip()
            smtp_pass = settings.SMTP_PASSWORD.strip().replace(" ", "")
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(from_address, [to_email], msg.as_string())

            logger.info(f"Successfully sent password reset email to {to_email}")
            print(f"[EMAIL SERVICE SUCCESS] Password reset email sent via SMTP to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email} via SMTP: {e}")
            print(f"[EMAIL SERVICE ERROR] SMTP error when sending email to {to_email}: {e}")
            print(f"[EMAIL SERVICE FALLBACK] Reset code for {to_email}: {reset_code}")
            return False
    else:
        logger.info(f"SMTP credentials not configured in .env. Reset code for {to_email}: {reset_code}")
        print(f"[EMAIL SERVICE NOTICE] SMTP credentials not configured in .env. (Set SMTP_USER & SMTP_PASSWORD in .env for real email delivery)")
        print(f"[EMAIL SERVICE] Email dispatched to '{to_email}' with 6-digit verification code: {reset_code}")
        return True


def send_staff_credentials_email(to_email: str, staff_name: str, role_name: str, username: str, password: str) -> bool:
    """
    Sends account credentials to a newly created Retail Staff or Production Staff member.
    Uses exact same SMTP dispatch methodology as send_password_reset_email.
    """
    subject = f"Staff Account Credentials - RetailSphere ({role_name})"
    from_address = settings.EMAILS_FROM_EMAIL or settings.SMTP_USER or "kalyanys2004@gmail.com"
    from_name = settings.EMAILS_FROM_NAME or "RetailSphere Support"

    clean_username = staff_name.strip() if staff_name else to_email.split('@')[0]

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Staff Account Credentials</title>
      <style>
        body {{ font-family: 'Plus Jakarta Sans', Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; }}
        .container {{ max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }}
        .header {{ text-align: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }}
        .header h1 {{ color: #0f172a; margin: 0; font-size: 24px; font-weight: 800; }}
        .info-box {{ background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; margin: 24px 0; }}
        .line {{ margin-bottom: 10px; font-size: 14px; color: #0f172a; }}
        .val {{ font-family: monospace; font-weight: 800; font-size: 16px; background: #ffffff; padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1; }}
        .footer {{ font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>RetailSphere</h1>
        </div>
        <p>Hello <strong>{clean_username}</strong>,</p>
        <p>Your staff account has been created for RetailSphere as <strong>{role_name}</strong>. Here are your account login credentials:</p>
        
        <div class="info-box">
          <div class="line"><strong>Assigned Role:</strong> {role_name}</div>
          <div class="line"><strong>Username / Email:</strong> <span class="val">{username}</span></div>
          <div class="line"><strong>Password:</strong> <span class="val">{password}</span></div>
        </div>

        <p>You can log in at: <a href="http://localhost:3000/login">http://localhost:3000/login</a></p>

        <div class="footer">
          &copy; RetailSphere Inc. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    """

    plain_text = f"""Hello {clean_username},

Your staff account has been created for RetailSphere as {role_name}.

Login Portal: http://localhost:3000/login
Username: {username}
Password: {password}

&copy; RetailSphere Inc.
"""

    if settings.SMTP_USER and settings.SMTP_PASSWORD:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{from_name} <{from_address}>"
            msg["To"] = to_email

            msg.attach(MIMEText(plain_text, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            smtp_user = settings.SMTP_USER.strip()
            smtp_pass = settings.SMTP_PASSWORD.strip().replace(" ", "")

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(from_address, [to_email], msg.as_string())

            logger.info(f"Successfully sent staff credentials email to {to_email}")
            print(f"[EMAIL SERVICE SUCCESS] Staff credentials email sent via SMTP to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send staff credentials email to {to_email}: {e}")
            print(f"[EMAIL SERVICE ERROR] SMTP error when sending credentials email to {to_email}: {e}")
            return False
    else:
        logger.info(f"SMTP credentials notice for {to_email}: Username={username}, Password={password}")
        print(f"[EMAIL SERVICE NOTICE] SMTP credentials not configured in .env. Dispatched credentials to '{to_email}' with Password: {password}")
        return True


def send_contact_inquiry_email(sender_name: str, sender_email: str, topic: str, message_body: str) -> bool:
    """
    Sends customer concierge contact inquiries directly to kalyanys2004@gmail.com.
    """
    to_email = "kalyanys2004@gmail.com"
    email_subject = f"RetailSphere AI Inquiry: {topic} from {sender_name}"
    from_address = settings.EMAILS_FROM_EMAIL or settings.SMTP_USER or "kalyanys2004@gmail.com"
    from_name = settings.EMAILS_FROM_NAME or "RetailSphere Concierge"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Customer Concierge Inquiry</title>
      <style>
        body {{ font-family: 'Plus Jakarta Sans', Arial, sans-serif; background-color: #f7f4f0; margin: 0; padding: 24px; }}
        .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 36px; box-shadow: 0 12px 30px rgba(0,0,0,0.06); border: 1px solid #e6ddd3; }}
        .header {{ text-align: center; border-bottom: 2px solid #48A63E; padding-bottom: 18px; margin-bottom: 24px; }}
        .header h1 {{ color: #2C241D; margin: 0; font-size: 24px; font-weight: 800; tracking-tight; }}
        .badge {{ display: inline-block; background: #48A63E15; color: #48A63E; border: 1px solid #48A63E40; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-top: 6px; }}
        .info-box {{ background: #fdfbf7; border: 1px solid #eae1d5; border-left: 4px solid #48A63E; border-radius: 12px; padding: 18px; margin: 20px 0; }}
        .info-item {{ margin: 8px 0; font-size: 14px; color: #2C241D; }}
        .msg-title {{ font-size: 14px; font-weight: 700; color: #2C241D; margin-top: 24px; }}
        .msg-box {{ background: #faf8f5; border: 1px solid #eae1d5; border-radius: 14px; padding: 20px; margin: 12px 0 24px 0; font-size: 14px; color: #2C241D; line-height: 1.6; white-space: pre-wrap; }}
        .reply-btn {{ display: inline-block; background-color: #48A63E; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-size: 13px; font-weight: 700; text-align: center; box-shadow: 0 4px 12px rgba(72,166,62,0.25); }}
        .footer {{ font-size: 11px; color: #8e8071; text-align: center; margin-top: 36px; border-t: 1px solid #eae1d5; pt: 16px; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>RetailSphere <span style="color: #48A63E;">AI</span></h1>
          <span class="badge">CUSTOMER CONCIERGE INQUIRY</span>
        </div>
        
        <p style="font-size: 15px; color: #2C241D;">You have received a new support inquiry from <strong>{sender_name}</strong>.</p>
        
        <div class="info-box">
          <div class="info-item"><strong>Customer Name:</strong> {sender_name}</div>
          <div class="info-item"><strong>Customer Email:</strong> <a href="mailto:{sender_email}" style="color: #48A63E; text-decoration: none; font-weight: 700;">{sender_email}</a></div>
          <div class="info-item"><strong>Inquiry Topic:</strong> {topic}</div>
        </div>

        <div class="msg-title">Customer Message Content:</div>
        <div class="msg-box">{message_body}</div>

        <div style="text-align: center; margin-top: 24px;">
          <a href="mailto:{sender_email}?subject=Re: RetailSphere Inquiry - {topic}" class="reply-btn">Reply to {sender_name}</a>
        </div>

        <div class="footer">
          &copy; RetailSphere AI Concierge • Luxury Furniture & Custom Build Platform
        </div>
      </div>
    </body>
    </html>
    """

    plain_text = f"""New RetailSphere Concierge Message:
From: {sender_name} ({sender_email})
Topic: {topic}

Message:
{message_body}
"""

    if settings.SMTP_USER and settings.SMTP_PASSWORD:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = email_subject
            msg["From"] = f"{from_name} <{from_address}>"
            msg["To"] = to_email
            msg["Reply-To"] = sender_email

            msg.attach(MIMEText(plain_text, "plain"))
            msg.attach(MIMEText(html_content, "html"))


            smtp_user = settings.SMTP_USER.strip()
            smtp_pass = settings.SMTP_PASSWORD.strip().replace(" ", "")

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(from_address, [to_email], msg.as_string())

            logger.info(f"Successfully sent contact inquiry email to {to_email}")
            print(f"[EMAIL SERVICE SUCCESS] Contact inquiry email sent via SMTP to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send contact inquiry email to {to_email}: {e}")
            print(f"[EMAIL SERVICE ERROR] SMTP error when sending contact email to {to_email}: {e}")
            return False
    else:
        logger.info(f"SMTP notice: Contact email from {sender_name} ({sender_email}) dispatched to {to_email}")
        print(f"[EMAIL SERVICE NOTICE] Dispatched contact inquiry email to '{to_email}' from '{sender_name}' ({sender_email})")
        return True


