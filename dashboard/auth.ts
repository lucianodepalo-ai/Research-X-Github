import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials) {
        const validEmail = process.env.AUTH_EMAIL;
        const validPassword = process.env.AUTH_PASSWORD;
        if (
          credentials?.email === validEmail &&
          credentials?.password === validPassword
        ) {
          return { id: "1", email: validEmail };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  session: { strategy: "jwt" },
});
