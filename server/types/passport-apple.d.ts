declare module 'passport-apple' {
  import { Strategy as PassportStrategy } from 'passport';

  interface AppleStrategyOptions {
    clientID: string | undefined;
    teamID: string | undefined;
    keyID: string | undefined;
    privateKeyString: string | undefined;
    callbackURL: string;
    passReqToCallback?: boolean;
  }

  interface AppleProfile {
    email?: string;
    name?: { firstName?: string; lastName?: string };
  }

  type VerifyCallback = (err: Error | null, userId?: number) => void;

  type VerifyFunction = (
    accessToken: string,
    refreshToken: string,
    idToken: string,
    profile: AppleProfile,
    done: VerifyCallback
  ) => void;

  class Strategy extends PassportStrategy {
    constructor(options: AppleStrategyOptions, verify: VerifyFunction);
    name: string;
    authenticate(req: unknown, options?: unknown): void;
  }

  export = Strategy;
}
