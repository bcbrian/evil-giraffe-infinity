import { createCookieSessionStorage } from "@netlify/remix-runtime";

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage({
    cookie: {
      name: "__session",
      secrets: ["s3cr3t"], // Replace with your secret
      sameSite: "lax",
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    },
  });

export { getSession, commitSession, destroySession };
