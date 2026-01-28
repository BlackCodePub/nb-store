import nodemailer from 'nodemailer';
import { prisma } from '../db/client';
import { emailTemplateDefinitions, type EmailTemplateKey } from '../../shared/email-templates';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  // Em desenvolvimento, apenas log
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
    console.log('📧 [DEV] Email would be sent:');
    console.log(`   To: ${options.to}`);
    console.log(`   Subject: ${options.subject}`);
    console.log(`   Body: ${options.text || options.html.substring(0, 200)}...`);
    return true;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"nb-store" <noreply@nb-store.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return true;
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    return false;
  }
}

function renderTemplate(template: string, variables: Record<string, string | number | undefined>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

export async function buildEmailFromTemplate(
  key: EmailTemplateKey,
  variables: Record<string, string | number | undefined>
): Promise<{ subject: string; html: string; text: string }> {
  const fallback = emailTemplateDefinitions.find((template) => template.key === key);
  const custom = await prisma.emailTemplate.findUnique({ where: { key } }).catch(() => null);

  const subjectTemplate = custom?.subject || fallback?.subject || key;
  const htmlTemplate = custom?.html || fallback?.html || '';
  const textTemplate = custom?.text || fallback?.text || '';

  return {
    subject: renderTemplate(subjectTemplate, variables),
    html: renderTemplate(htmlTemplate, variables),
    text: renderTemplate(textTemplate, variables),
  };
}

export function generateResetPasswordEmail(resetUrl: string, userName?: string): { html: string; text: string } {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #0d6efd; color: white; text-decoration: none; border-radius: 4px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Recuperação de senha</h2>
        <p>Olá${userName ? ` ${userName}` : ''},</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta na nb-store.</p>
        <p>Clique no botão abaixo para criar uma nova senha:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" class="button">Redefinir senha</a>
        </p>
        <p>Ou copie e cole este link no seu navegador:</p>
        <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">
          ${resetUrl}
        </p>
        <p><strong>Este link expira em 1 hora.</strong></p>
        <p>Se você não solicitou esta alteração, ignore este e-mail.</p>
        <div class="footer">
          <p>Este é um e-mail automático, não responda.</p>
          <p>nb-store</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Recuperação de senha

Olá${userName ? ` ${userName}` : ''},

Recebemos uma solicitação para redefinir a senha da sua conta na nb-store.

Clique no link abaixo para criar uma nova senha:
${resetUrl}

Este link expira em 1 hora.

Se você não solicitou esta alteração, ignore este e-mail.

nb-store
  `.trim();

  return { html, text };
}

export function generateEmailVerificationEmail(verifyUrl: string, userName?: string): { html: string; text: string } {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #198754; color: white; text-decoration: none; border-radius: 4px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Confirme seu e-mail</h2>
        <p>Olá${userName ? ` ${userName}` : ''},</p>
        <p>Obrigado por se cadastrar na nb-store!</p>
        <p>Por favor, confirme seu e-mail clicando no botão abaixo:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" class="button">Confirmar e-mail</a>
        </p>
        <p>Ou copie e cole este link no seu navegador:</p>
        <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">
          ${verifyUrl}
        </p>
        <p><strong>Este link expira em 24 horas.</strong></p>
        <div class="footer">
          <p>Este é um e-mail automático, não responda.</p>
          <p>nb-store</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Confirme seu e-mail

Olá${userName ? ` ${userName}` : ''},

Obrigado por se cadastrar na nb-store!

Por favor, confirme seu e-mail acessando o link abaixo:
${verifyUrl}

Este link expira em 24 horas.

nb-store
  `.trim();

  return { html, text };
}

export function generateDataExportReadyEmail(downloadUrl: string, userName?: string): { html: string; text: string } {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #0d6efd; color: white; text-decoration: none; border-radius: 4px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Exportação de dados pronta</h2>
        <p>Olá${userName ? ` ${userName}` : ''},</p>
        <p>Sua solicitação de exportação de dados foi processada e está pronta para download.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${downloadUrl}" class="button">Baixar meus dados</a>
        </p>
        <p>Ou copie e cole este link no seu navegador:</p>
        <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">
          ${downloadUrl}
        </p>
        <p>Se você não reconhece esta solicitação, ignore este e-mail.</p>
        <div class="footer">
          <p>Este é um e-mail automático, não responda.</p>
          <p>nb-store</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Exportação de dados pronta

Olá${userName ? ` ${userName}` : ''},

Sua solicitação de exportação de dados foi processada e está pronta para download.

Baixe seus dados aqui:
${downloadUrl}

Se você não reconhece esta solicitação, ignore este e-mail.

nb-store
  `.trim();

  return { html, text };
}

export function generateOrderPaidEmail(params: {
  orderId: string;
  total: number;
  orderUrl: string;
  userName?: string;
  itemsCount?: number;
}): { html: string; text: string } {
  const { orderId, total, orderUrl, userName, itemsCount } = params;
  const formattedTotal = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(total);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #198754; color: white; text-decoration: none; border-radius: 4px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Pagamento confirmado</h2>
        <p>Olá${userName ? ` ${userName}` : ''},</p>
        <p>Recebemos o pagamento do seu pedido <strong>#${orderId}</strong>.</p>
        ${itemsCount ? `<p>Total de itens: <strong>${itemsCount}</strong></p>` : ''}
        <p>Total do pedido: <strong>${formattedTotal}</strong></p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${orderUrl}" class="button">Ver pedido</a>
        </p>
        <p>Obrigado por comprar com a nb-store!</p>
        <div class="footer">
          <p>Este é um e-mail automático, não responda.</p>
          <p>nb-store</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Pagamento confirmado

Olá${userName ? ` ${userName}` : ''},

Recebemos o pagamento do seu pedido #${orderId}.
${itemsCount ? `Total de itens: ${itemsCount}\n` : ''}
Total do pedido: ${formattedTotal}

Ver pedido: ${orderUrl}

Obrigado por comprar com a nb-store!

nb-store
  `.trim();

  return { html, text };
}

export function generateOrderCancelledEmail(params: {
  orderId: string;
  orderUrl: string;
  userName?: string;
  reason?: string;
}): { html: string; text: string } {
  const { orderId, orderUrl, userName, reason } = params;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Pedido cancelado</h2>
        <p>Olá${userName ? ` ${userName}` : ''},</p>
        <p>Seu pedido <strong>#${orderId}</strong> foi cancelado.</p>
        ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
        <p style="text-align: center; margin: 30px 0;">
          <a href="${orderUrl}" class="button">Ver pedido</a>
        </p>
        <p>Se tiver dúvidas, entre em contato com nosso suporte.</p>
        <div class="footer">
          <p>Este é um e-mail automático, não responda.</p>
          <p>nb-store</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Pedido cancelado

Olá${userName ? ` ${userName}` : ''},

Seu pedido #${orderId} foi cancelado.
${reason ? `Motivo: ${reason}\n` : ''}
Ver pedido: ${orderUrl}

Se tiver dúvidas, entre em contato com nosso suporte.

nb-store
  `.trim();

  return { html, text };
}
