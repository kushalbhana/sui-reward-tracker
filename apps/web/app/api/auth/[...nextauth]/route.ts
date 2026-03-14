import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import { connectToDatabase, User, Subscription } from "@repo/db";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID || "",
      clientSecret: process.env.GOOGLE_SECRET || "",
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || !user.email) {
        return false;
      }
      
      try {
        await connectToDatabase();
        
        let existingUser = await User.findOne({ email: user.email });
        
        if (!existingUser) {
          // First time user, sign them up
          existingUser = await User.create({
            name: user.name || "Unknown User",
            email: user.email,
            image: user.image,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          });
          // Appending a custom property to let client know it's a signup (can be handled via redirect/cookies sometimes)
          // For now, NextAuth token can carry this.
          (user as any).isNewUser = true;
        } else {
          (user as any).isNewUser = false;
        }
        
        // Attach DB user ID to the user object
        (user as any).id = existingUser._id.toString();
        return true;
      } catch (error) {
        console.error("Error saving user to DB:", error);
        return false;
      }
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.isNewUser = (user as any).isNewUser;
      }

      // Refresh subscription status on every token refresh
      if (token.id) {
        try {
          await connectToDatabase();
          const activeSubscription = await Subscription.findOne({
            userId: token.id,
            status: "active",
            expiresAt: { $gt: new Date() },
          });
          token.plan = activeSubscription ? "pro" : "free";
        } catch {
          token.plan = token.plan || "free";
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).isNewUser = token.isNewUser;
        (session.user as any).plan = token.plan || "free";
      }
      return session;
    },
  },
  pages: {
    // You could specify custom pages here if needed
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_dev",
});

export { handler as GET, handler as POST };

