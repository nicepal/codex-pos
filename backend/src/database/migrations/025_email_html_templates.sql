-- Upgrade platform email template bodies to richer HTML content blocks.
-- Outer branded layout is applied at send-time by email.layout.js.

UPDATE email_templates SET
  body_html = CASE slug
    WHEN 'welcome' THEN
      '<h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">Welcome aboard</h1>
<p style="margin:0 0 14px;">Hello {{user_name}},</p>
<p style="margin:0 0 14px;">Your account for <strong>{{business_name}}</strong> is ready on {{brand_name}}.</p>
<p style="margin:0;">Sign in anytime to manage sales, inventory, and your storefront.</p>'
    WHEN 'password_reset' THEN
      '<h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">Reset your password</h1>
<p style="margin:0 0 14px;">Hello {{user_name}},</p>
<p style="margin:0 0 18px;">We received a request to reset your password. Click the button below to choose a new one.</p>
<p style="margin:0 0 18px;"><a href="{{reset_link}}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Reset password</a></p>
<p style="margin:0;font-size:13px;color:#64748b;">This link expires in 1 hour. If you did not request this, you can ignore this email.</p>'
    WHEN 'email_verification' THEN
      '<h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">Verify your email</h1>
<p style="margin:0 0 14px;">Hello {{user_name}},</p>
<p style="margin:0 0 18px;">Please confirm your email address to finish setting up your account.</p>
<p style="margin:0;"><a href="{{verification_link}}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Verify email</a></p>'
    WHEN 'invoice' THEN
      '<h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">Invoice ready</h1>
<p style="margin:0 0 14px;">Hello {{customer_name}},</p>
<p style="margin:0;">Your invoice <strong>{{invoice_number}}</strong> for <strong>{{amount}}</strong> is ready.</p>'
    WHEN 'purchase_order' THEN
      '<h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">Purchase order</h1>
<p style="margin:0 0 14px;">Hello,</p>
<p style="margin:0;">Please find purchase order <strong>{{purchase_order_number}}</strong> from <strong>{{business_name}}</strong>.</p>'
    WHEN 'order_confirmation' THEN
      '<h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">Order confirmed</h1>
<p style="margin:0 0 14px;">Hello {{customer_name}},</p>
<p style="margin:0;">Your order <strong>{{order_number}}</strong> has been confirmed.</p>'
    WHEN 'staff_invitation' THEN
      '<h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">You''re invited</h1>
<p style="margin:0 0 14px;">Hello {{user_name}},</p>
<p style="margin:0;">You have been invited to join <strong>{{business_name}}</strong> on {{brand_name}}.</p>'
    WHEN 'support_ticket' THEN
      '<h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">Support update</h1>
<p style="margin:0 0 14px;">Hello {{user_name}},</p>
<p style="margin:0;">There is an update on your support ticket.</p>'
    WHEN 'contact_form' THEN
      '<h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">New contact submission</h1>
<p style="margin:0;">A new contact form submission was received from <strong>{{customer_name}}</strong>.</p>'
    WHEN 'subscription_activated' THEN
      '<h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">Subscription active</h1>
<p style="margin:0 0 14px;">Hello {{user_name}},</p>
<p style="margin:0;">Your subscription <strong>{{subscription_name}}</strong> is now active.</p>'
    WHEN 'subscription_expired' THEN
      '<h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">Subscription expired</h1>
<p style="margin:0 0 14px;">Hello {{user_name}},</p>
<p style="margin:0;">Your subscription <strong>{{subscription_name}}</strong> expired on {{expiry_date}}.</p>'
    WHEN 'trial_expiry' THEN
      '<h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">Trial ending soon</h1>
<p style="margin:0;">Hi {{user_name}}, your trial for <strong>{{business_name}}</strong> ends soon. Upgrade to keep your store running without interruption.</p>'
    WHEN 'subscription_renewal' THEN
      '<h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">Subscription renewed</h1>
<p style="margin:0;">Your <strong>{{subscription_name}}</strong> subscription has been renewed successfully.</p>'
    ELSE body_html
  END,
  variables = CASE slug
    WHEN 'welcome' THEN '["business_name","user_name","app_name","brand_name"]'::jsonb
    WHEN 'password_reset' THEN '["user_name","reset_link","business_name","brand_name"]'::jsonb
    WHEN 'email_verification' THEN '["user_name","verification_link","brand_name"]'::jsonb
    WHEN 'invoice' THEN '["customer_name","invoice_number","amount","business_name","branch_name"]'::jsonb
    WHEN 'purchase_order' THEN '["purchase_order_number","business_name","branch_name"]'::jsonb
    WHEN 'order_confirmation' THEN '["customer_name","order_number","business_name","branch_name"]'::jsonb
    WHEN 'staff_invitation' THEN '["user_name","business_name","brand_name","branch_name"]'::jsonb
    ELSE variables
  END,
  updated_at = NOW()
WHERE tenant_id IS NULL;
