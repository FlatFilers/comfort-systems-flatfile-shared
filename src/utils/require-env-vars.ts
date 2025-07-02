export const requireEnvVars = (envVars: string[]) => {
  envVars.forEach((envVar) => {
    if (!process.env[envVar]) {
      throw new Error(`Environment variable ${envVar} is not set.`);
    }
  });
};