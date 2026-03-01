/// <reference types="node" />
import { convexAuth } from '@convex-dev/auth/server'
import { Email } from '@convex-dev/auth/providers/Email'

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Email({
      id: 'resend-otp',
      generateVerificationToken: () => String(Math.floor(100000 + Math.random() * 900000)),
      sendVerificationRequest: async ({ identifier: email, token }) => {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.AUTH_RESEND_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.AUTH_EMAIL_FROM ?? 'noreply@example.com',
            to: email,
            subject: 'Your ClothePickr sign-in code',
            text: `Your sign-in code: ${token}\n\nThis code expires in 15 minutes.`,
          }),
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`Failed to send verification email: ${error}`)
        }
      },
    }),
  ],
})
