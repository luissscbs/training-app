import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { users } from "@/db/schema";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

/** false hasta que pongas GOOGLE_CLIENT_ID/SECRET en .env.local */
export const googleConfigured = Boolean(googleClientId && googleClientSecret);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  // Se pasan explícitos: @auth/core solo lee AUTH_GOOGLE_ID/SECRET del
  // entorno, no GOOGLE_CLIENT_ID/SECRET.
  providers: googleConfigured
    ? [Google({ clientId: googleClientId, clientSecret: googleClientSecret })]
    : [],
  callbacks: {
    // Crea la fila en nuestra tabla users en el primer login (id = sub de Google).
    async signIn({ user }) {
      try {
        if (user.id && user.email) {
          await db
            .insert(users)
            .values({
              id: user.id,
              email: user.email,
              name: user.name ?? null,
              image: user.image ?? null,
            })
            .onConflictDoNothing();
        }
      } catch (err) {
        console.error("signIn: no se pudo sincronizar users", err);
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
