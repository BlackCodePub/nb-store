export type EmailTemplateKey =
  | 'auth.verify_email'
  | 'auth.reset_password'
  | 'lgpd.export_ready'
  | 'order.paid'
  | 'order.cancelled';

export interface EmailTemplateDefinition {
  key: EmailTemplateKey;
  name: string;
  audience: 'usuarios' | 'clientes' | 'staff';
  subject: string;
  html: string;
  text: string;
  variables: string[];
}

export const emailTemplateDefinitions: EmailTemplateDefinition[] = [
  {
    key: 'auth.verify_email',
    name: 'Verificação de e-mail',
    audience: 'usuarios',
    subject: 'Confirme seu e-mail - nb-store',
    variables: ['userName', 'verifyUrl'],
    html: `
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
    <p>Olá{{userName}},</p>
    <p>Obrigado por se cadastrar na nb-store!</p>
    <p>Por favor, confirme seu e-mail clicando no botão abaixo:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{verifyUrl}}" class="button">Confirmar e-mail</a>
    </p>
    <p>Ou copie e cole este link no seu navegador:</p>
    <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">
      {{verifyUrl}}
    </p>
    <p><strong>Este link expira em 24 horas.</strong></p>
    <div class="footer">
      <p>Este é um e-mail automático, não responda.</p>
      <p>nb-store</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
    text: `
Confirme seu e-mail

Olá{{userName}},

Obrigado por se cadastrar na nb-store!

Por favor, confirme seu e-mail acessando o link abaixo:
{{verifyUrl}}

Este link expira em 24 horas.

nb-store
    `.trim(),
  },
  {
    key: 'auth.reset_password',
    name: 'Recuperação de senha',
    audience: 'usuarios',
    subject: 'Recuperação de senha - nb-store',
    variables: ['userName', 'resetUrl'],
    html: `
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
    <p>Olá{{userName}},</p>
    <p>Recebemos uma solicitação para redefinir a senha da sua conta na nb-store.</p>
    <p>Clique no botão abaixo para criar uma nova senha:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{resetUrl}}" class="button">Redefinir senha</a>
    </p>
    <p>Ou copie e cole este link no seu navegador:</p>
    <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">
      {{resetUrl}}
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
    `.trim(),
    text: `
Recuperação de senha

Olá{{userName}},

Recebemos uma solicitação para redefinir a senha da sua conta na nb-store.

Clique no link abaixo para criar uma nova senha:
{{resetUrl}}

Este link expira em 1 hora.

Se você não solicitou esta alteração, ignore este e-mail.

nb-store
    `.trim(),
  },
  {
    key: 'lgpd.export_ready',
    name: 'LGPD: exportação pronta',
    audience: 'usuarios',
    subject: 'Sua exportação de dados está pronta',
    variables: ['userName', 'downloadUrl'],
    html: `
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
    <p>Olá{{userName}},</p>
    <p>Sua solicitação de exportação de dados foi processada e está pronta para download.</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{downloadUrl}}" class="button">Baixar meus dados</a>
    </p>
    <p>Ou copie e cole este link no seu navegador:</p>
    <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">
      {{downloadUrl}}
    </p>
    <p>Se você não reconhece esta solicitação, ignore este e-mail.</p>
    <div class="footer">
      <p>Este é um e-mail automático, não responda.</p>
      <p>nb-store</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
    text: `
Exportação de dados pronta

Olá{{userName}},

Sua solicitação de exportação de dados foi processada e está pronta para download.

Baixe seus dados aqui:
{{downloadUrl}}

Se você não reconhece esta solicitação, ignore este e-mail.

nb-store
    `.trim(),
  },
  {
    key: 'order.paid',
    name: 'Pedido pago',
    audience: 'clientes',
    subject: 'Pagamento confirmado • Pedido #{{orderId}}',
    variables: ['userName', 'orderId', 'formattedTotal', 'orderUrl', 'itemsCountBlock', 'itemsCountText'],
    html: `
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
    <p>Olá{{userName}},</p>
    <p>Recebemos o pagamento do seu pedido <strong>#{{orderId}}</strong>.</p>
    {{itemsCountBlock}}
    <p>Total do pedido: <strong>{{formattedTotal}}</strong></p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{orderUrl}}" class="button">Ver pedido</a>
    </p>
    <p>Obrigado por comprar com a nb-store!</p>
    <div class="footer">
      <p>Este é um e-mail automático, não responda.</p>
      <p>nb-store</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
    text: `
Pagamento confirmado

Olá{{userName}},

Recebemos o pagamento do seu pedido #{{orderId}}.
{{itemsCountText}}Total do pedido: {{formattedTotal}}

Ver pedido: {{orderUrl}}

Obrigado por comprar com a nb-store!

nb-store
    `.trim(),
  },
  {
    key: 'order.cancelled',
    name: 'Pedido cancelado',
    audience: 'clientes',
    subject: 'Pedido cancelado • #{{orderId}}',
    variables: ['userName', 'orderId', 'orderUrl', 'reasonBlock', 'reasonText'],
    html: `
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
    <p>Olá{{userName}},</p>
    <p>Seu pedido <strong>#{{orderId}}</strong> foi cancelado.</p>
    {{reasonBlock}}
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{orderUrl}}" class="button">Ver pedido</a>
    </p>
    <p>Se tiver dúvidas, entre em contato com nosso suporte.</p>
    <div class="footer">
      <p>Este é um e-mail automático, não responda.</p>
      <p>nb-store</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
    text: `
Pedido cancelado

Olá{{userName}},

Seu pedido #{{orderId}} foi cancelado.
{{reasonText}}Ver pedido: {{orderUrl}}

Se tiver dúvidas, entre em contato com nosso suporte.

nb-store
    `.trim(),
  },
];
