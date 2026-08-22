import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { DataModel } from "./_generated/dataModel";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params) {
        const email = params.email as string;
        if (params.flow === "signUp") {
          return {
            email,
            agreedToTerms: params.agreedToTerms === "true",
            wantsNotifications: params.wantsNotifications === "true",
            profileComplete: false,
          };
        }
        return { email };
      },
    }),
  ],
});
