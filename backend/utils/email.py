import os
import logging
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

# Brevo SMTP config
BREVO_SMTP_HOST = "smtp-relay.brevo.com"
BREVO_SMTP_PORT = 587
BREVO_SMTP_USER = os.getenv("BREVO_SMTP_USER", "")
BREVO_SMTP_PASS = os.getenv("BREVO_SMTP_PASS", "")
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL", "noreply@intellilearn.com")
BREVO_SENDER_NAME = "IntelliLearn"


def load_template(template_name: str, context: dict) -> str:
    """
    Loads an HTML email template from backend/templates/ and formats it with the context.
    """
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        template_path = os.path.join(base_dir, "templates", template_name)

        if not os.path.exists(template_path):
            logger.error(f"Template file not found: {template_path}")
            return f"Template {template_name} not found. Details: {str(context)}"

        with open(template_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Replace {{key}} placeholders with context values
        for key, val in context.items():
            content = content.replace(f"{{{{{key}}}}}", str(val))

        return content
    except Exception as e:
        logger.exception(f"Error loading template {template_name}: {e}")
        return f"Error loading email body. Details: {str(context)}"


def send_email(to_email: str, to_name: str, subject: str, template_name: str, context: dict) -> bool:
    """
    Sends a transactional HTML email via Brevo SMTP relay.
    Uses SMTP credentials (xsmtpsib- key) which are the correct Brevo SMTP password.
    """
    if not BREVO_SMTP_USER or not BREVO_SMTP_PASS:
        logger.error("BREVO_SMTP_USER or BREVO_SMTP_PASS is not configured in the environment.")
        return False

    html_content = load_template(template_name, context)

    try:
        # Compose the email
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{BREVO_SENDER_NAME} <{BREVO_SENDER_EMAIL}>"
        msg["To"] = f"{to_name} <{to_email}>"

        # Attach HTML body
        html_part = MIMEText(html_content, "html", "utf-8")
        msg.attach(html_part)

        # Connect to Brevo SMTP relay using STARTTLS on port 587
        context_ssl = ssl.create_default_context()
        with smtplib.SMTP(BREVO_SMTP_HOST, BREVO_SMTP_PORT, timeout=15) as server:
            server.ehlo()
            server.starttls(context=context_ssl)
            server.ehlo()
            server.login(BREVO_SMTP_USER, BREVO_SMTP_PASS)
            server.sendmail(BREVO_SENDER_EMAIL, to_email, msg.as_string())

        logger.info(f"Email sent successfully via SMTP to {to_email} — subject: '{subject}'")
        return True

    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP authentication failed for {to_email}: {e}")
        return False
    except smtplib.SMTPRecipientsRefused as e:
        logger.error(f"Recipient refused for {to_email}: {e}")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error sending to {to_email}: {e}")
        return False
    except Exception as e:
        logger.exception(f"Unexpected error sending email to {to_email}: {e}")
        return False
