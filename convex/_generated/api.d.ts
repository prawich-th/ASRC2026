/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTP from "../ResendOTP.js";
import type * as abstracts from "../abstracts.js";
import type * as adminUsers from "../adminUsers.js";
import type * as affiliations from "../affiliations.js";
import type * as announcements from "../announcements.js";
import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as keyDates from "../keyDates.js";
import type * as lib_abstract from "../lib/abstract.js";
import type * as lib_affiliation from "../lib/affiliation.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_content from "../lib/content.js";
import type * as lib_emailTemplates from "../lib/emailTemplates.js";
import type * as lib_mail from "../lib/mail.js";
import type * as lib_mailSignature from "../lib/mailSignature.js";
import type * as lib_notification from "../lib/notification.js";
import type * as lib_preRegistration from "../lib/preRegistration.js";
import type * as lib_profile from "../lib/profile.js";
import type * as lib_profileInput from "../lib/profileInput.js";
import type * as lib_resendKey from "../lib/resendKey.js";
import type * as lib_webhookSignature from "../lib/webhookSignature.js";
import type * as mail from "../mail.js";
import type * as mailActions from "../mailActions.js";
import type * as notifications from "../notifications.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  abstracts: typeof abstracts;
  adminUsers: typeof adminUsers;
  affiliations: typeof affiliations;
  announcements: typeof announcements;
  auth: typeof auth;
  http: typeof http;
  keyDates: typeof keyDates;
  "lib/abstract": typeof lib_abstract;
  "lib/affiliation": typeof lib_affiliation;
  "lib/auth": typeof lib_auth;
  "lib/content": typeof lib_content;
  "lib/emailTemplates": typeof lib_emailTemplates;
  "lib/mail": typeof lib_mail;
  "lib/mailSignature": typeof lib_mailSignature;
  "lib/notification": typeof lib_notification;
  "lib/preRegistration": typeof lib_preRegistration;
  "lib/profile": typeof lib_profile;
  "lib/profileInput": typeof lib_profileInput;
  "lib/resendKey": typeof lib_resendKey;
  "lib/webhookSignature": typeof lib_webhookSignature;
  mail: typeof mail;
  mailActions: typeof mailActions;
  notifications: typeof notifications;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
};
