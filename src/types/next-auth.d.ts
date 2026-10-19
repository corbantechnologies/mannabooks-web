import "next-auth";
import "next-auth/jwt";

interface SessionUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

declare module "next-auth" {
  interface User {
    access?: string;
    refresh?: string;
  }
  interface Session {
    user: SessionUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    access: string;
    refresh: string;
    accessExpires: number;
    user: SessionUser;
  }
}
