declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
    NEXTAUTH_URL: string;
    NEXTAUTH_SECRET: string;
    NEXT_PUBLIC_SOCKET_URL?: string;
    NODE_ENV: 'development' | 'production' | 'test';
  }
}
