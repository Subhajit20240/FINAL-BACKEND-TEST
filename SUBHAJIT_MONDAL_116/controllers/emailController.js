import nodemailer from 'nodemailer';

const sendVerificationEmail = async (email, verificationCode) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const verificationUrl = `${baseUrl}/api/verify/${verificationCode}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your Email',
      html: `
        <h2>Email Verification</h2>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
        <p>This link will expire in 24 hours.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Verification email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Email could not be sent');
  }
};

export { sendVerificationEmail };