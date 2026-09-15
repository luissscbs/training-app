import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";
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
      if (user?.id) {
        // La sesión debe apuntar a la fila real en users. Si ya existe una
        // fila con este email (creada antes o con otra identidad), se adopta
        // su id; si no, el insert del signIn ya creó la fila con user.id.
        // Sin esto, lecturas y escrituras van a un id huérfano: los UPDATE
        // tocan 0 filas en silencio y el IMC / la unidad nunca se muestran.
        try {
          if (user.email) {
            const existing = await db.query.users.findFirst({
              where: eq(users.email, user.email),
              columns: { id: true },
            });
            token.sub = existing?.id ?? user.id;
          } else {
            token.sub = user.id;
          }
        } catch (err) {
          console.error("jwt: no se pudo resolver la identidad", err);
          token.sub = user.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        let id = token.sub;
        try {
          // Repara cookies ya emitidas con una sub huérfana (sin fila en
          // users): adopta la fila del mismo email para que la app lea y
          // escriba donde toca desde la primera carga, sin re-login.
          const byId = await db.query.users.findFirst({
            where: eq(users.id, token.sub),
            columns: { id: true },
          });
          if (!byId) {
            const email =
              session.user.email ??
              (typeof token.email === "string" ? token.email : undefined);
            if (email) {
              const byEmail = await db.query.users.findFirst({
                where: eq(users.email, email),
                columns: { id: true },
              });
              if (byEmail) id = byEmail.id;
            }
          }
        } catch (err) {
          console.error("session: no se pudo resolver la identidad", err);
        }
        session.user.id = id;
      }
      return session;
    },
  },
});
