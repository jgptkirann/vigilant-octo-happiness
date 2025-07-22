declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'production' | 'test';
    // Add other env variables you use here as needed
  }
}

declare var process: {
  env: NodeJS.ProcessEnv;
};
