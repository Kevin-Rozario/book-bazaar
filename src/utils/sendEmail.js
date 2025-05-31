import Mailgen from "mailgen";
import transporter from "./email.config.js";

const mailGenerator = new Mailgen({
  theme: "default",
  product: {
    name: process.env.APP_NAME,
    link: process.env.APP_URL,
  },
});

export const sendEmail = (options) => {
  try {
    const emailText = mailGenerator.generate(options.mailGenContent);
    const emailHtml = mailGenerator.generate(options.mailGenContent);

    const mailOptions = {
      from: process.env.MAILTRAP_SENDER,
      to: options.email,
      subject: options.subject,
      html: emailHtml,
      text: emailText,
    };

    const info = transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error.message);
    return error;
  }
};

export const emailVerificationMailGenContent = ({
  userName,
  verificationUrl,
}) => {
  return {
    body: {
      name: userName,
      intro: "Welcome to Book Bazaar! We're very excited to have you on board.",
      action: {
        instructions:
          "To get started with Book Bazaar and verify your email address, please click the button below:",
        button: {
          color: "#007bff",
          text: "Verify Your Account",
          link: verificationUrl,
        },
      },
      outro: [
        "If you did not create an account, no further action is required.",
        "Need help, or have questions? Just reply to this email, we'd love to assist you.",
      ],
    },
  };
};

export const passwordResetMailGenContent = ({ userName, passwordResetUrl }) => {
  return {
    body: {
      name: userName,
      intro:
        "You are receiving this email because a password reset request has been initiated for your Book Bazaar account.",
      action: {
        instructions: "To reset your password, please click the button below:",
        button: {
          color: "#dc3545",
          text: "Reset Your Password",
          link: passwordResetUrl,
        },
      },
      outro: [
        "If you did not request a password reset, please ignore this email. Your password will remain unchanged.",
        "For security reasons, this password reset link is only valid for a limited time.",
        "If you continue to have issues, please contact our support team.",
      ],
    },
  };
};
