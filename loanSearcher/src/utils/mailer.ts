import nodemailer from 'nodemailer';

export async function sendMail(body: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PW,
    },
    logger: true,
  });

  const subject = `${
    process.env.LOCALHOST_PROVIDER ? '(dev)' : ''
  } Liquidatable Loan`;

  const info = await transporter.sendMail({
    from: '"Aave Liquidator" <reports@novawulf.io>',
    to: process.env.NOTIFICATIONS_EMAIL,
    subject,
    text: body,
  });
  console.log('Message sent: %s', info.response);
}

export function sendLoanEmail(loans: string[]): void {
  if (loans.length > 0) {
    const body = [
      `Found ${loans.length} loans that should be profitable to liquidate:`,
    ];
    sendMail(body.concat(loans.flat()).join('\r\n'));
  }
}
