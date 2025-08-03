// utils/emailService.js
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendCredentialsEmail = async (to, password) => {
  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev', // Use Resend's test address or your verified domain
      to: to,
      subject: 'Your Account Credentials',
      html: `
          <h1>Welcome!</h1>
          <p>An account has been created for you on the Network Monitoring Dashboard.</p>
          <p>You can log in using the following credentials:</p>
          <ul>
              <li><strong>Email:</strong> ${to}</li>
              <li><strong>Password:</strong> ${password}</li>
          </ul>
          <p>It is highly recommended you change your password after your first login.</p>
      `,
    });

    console.log('✅ Credentials email sent successfully via Resend to:', to);
  } catch (error) {
    console.error('❌ Error sending email via Resend:', error);
    throw new Error('Failed to send credentials email.');
  }
};

module.exports = { sendCredentialsEmail };