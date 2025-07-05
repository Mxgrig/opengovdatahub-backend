import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
const createTransporter = () => {
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  } else if (process.env.EMAIL_SERVICE === 'brevo') {
    return nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_USER,
        pass: process.env.BREVO_PASS
      }
    });
  } else {
    // Default to Gmail
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
};

const transporter = createTransporter();

// Email templates
const getVerificationEmailTemplate = (verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  
  return {
    subject: 'Verify Your Email - OpenGov DataHub',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #2c3e50; margin: 0;">OpenGov DataHub</h1>
          <p style="color: #7f8c8d; margin: 5px 0;">UK Government Data Search Platform</p>
        </div>
        
        <div style="padding: 30px 20px; background-color: white;">
          <h2 style="color: #2c3e50; margin-bottom: 20px;">Welcome to OpenGov DataHub!</h2>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            Thank you for registering with OpenGov DataHub. To complete your registration and start searching UK government data, please verify your email address.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #777; font-size: 14px; margin-top: 30px;">
            If the button above doesn't work, copy and paste this link into your browser:
          </p>
          <p style="color: #3498db; font-size: 14px; word-break: break-all;">
            ${verificationUrl}
          </p>
          
          <p style="color: #777; font-size: 14px; margin-top: 30px;">
            This verification link will expire in 24 hours. If you didn't create an account with OpenGov DataHub, please ignore this email.
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #777; font-size: 12px;">
          <p>OpenGov DataHub - Your gateway to UK government data</p>
          <p>© 2024 OpenGov DataHub. All rights reserved.</p>
        </div>
      </div>
    `
  };
};

const getPasswordResetEmailTemplate = (resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  return {
    subject: 'Password Reset - OpenGov DataHub',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #2c3e50; margin: 0;">OpenGov DataHub</h1>
          <p style="color: #7f8c8d; margin: 5px 0;">UK Government Data Search Platform</p>
        </div>
        
        <div style="padding: 30px 20px; background-color: white;">
          <h2 style="color: #2c3e50; margin-bottom: 20px;">Password Reset Request</h2>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            You have requested to reset your password for your OpenGov DataHub account. Click the button below to set a new password.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #777; font-size: 14px; margin-top: 30px;">
            If the button above doesn't work, copy and paste this link into your browser:
          </p>
          <p style="color: #3498db; font-size: 14px; word-break: break-all;">
            ${resetUrl}
          </p>
          
          <p style="color: #777; font-size: 14px; margin-top: 30px;">
            This password reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #777; font-size: 12px;">
          <p>OpenGov DataHub - Your gateway to UK government data</p>
          <p>© 2024 OpenGov DataHub. All rights reserved.</p>
        </div>
      </div>
    `
  };
};

// Send verification email
export const sendVerificationEmail = async (email, verificationToken) => {
  try {
    const template = getVerificationEmailTemplate(verificationToken);
    
    const mailOptions = {
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: template.subject,
      html: template.html
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const template = getPasswordResetEmailTemplate(resetToken);
    
    const mailOptions = {
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: template.subject,
      html: template.html
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

// Test email configuration
export const testEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
};