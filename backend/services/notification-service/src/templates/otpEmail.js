/*
 * OTP email template.
 * A pure function that takes the recipient's name, the OTP code, and the purpose,
 * and returns BOTH a plain-text and an HTML version of the message. Returning
 * both lets the mailer support email clients that can't render HTML.
 * Default values (e.g. name='there') keep the email readable even if a field is missing.
 */
/** Premium-looking responsive HTML email for OTP delivery. */
module.exports = function otpEmail({ name = 'there', otp, purpose = 'Account Verification' }) {
  // Plain-text fallback. \n are line breaks; the values are interpolated in.
  const text = `Hi ${name},\n\nYour XWZ Parking ${purpose} code is: ${otp}\nIt expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.\n\n— XWZ Parking`;

  // Styled HTML version. Styles are inline because most email clients strip <style> tags.
  const html = `
  <div style="margin:0;padding:0;background:#0b1020;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:20px 20px 0 0;padding:32px;text-align:center;">
        <div style="font-size:26px;font-weight:800;color:#fff;letter-spacing:.5px;">🅿️ XWZ Parking</div>
        <div style="color:#dbeafe;font-size:13px;margin-top:6px;">Smart Parking Management • Kigali</div>
      </div>
      <div style="background:#11162a;border-radius:0 0 20px 20px;padding:36px 32px;color:#e5e7eb;">
        <p style="font-size:16px;margin:0 0 8px;">Hi <strong>${name}</strong>,</p>
        <p style="font-size:14px;color:#9ca3af;margin:0 0 24px;">Use the code below to complete your <strong style="color:#c4b5fd;">${purpose}</strong>. It expires in <strong>10 minutes</strong>.</p>
        <div style="text-align:center;margin:8px 0 28px;">
          <div style="display:inline-block;background:#1e2440;border:1px solid #4f46e5;border-radius:16px;padding:18px 28px;font-size:38px;font-weight:800;letter-spacing:12px;color:#fff;">${otp}</div>
        </div>
        <p style="font-size:12px;color:#6b7280;margin:0;">If you didn't request this, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #1f2640;margin:24px 0;" />
        <p style="font-size:12px;color:#6b7280;margin:0;text-align:center;">© ${new Date().getFullYear()} XWZ LTD — Kigali, Rwanda</p>
      </div>
    </div>
  </div>`;

  return { text, html }; // both versions; the mailer attaches each to the outgoing email
};
