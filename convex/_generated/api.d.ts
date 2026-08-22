/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as abstracts from "../abstracts.js";
import type * as adminUsers from "../adminUsers.js";
import type * as announcements from "../announcements.js";
import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as keyDates from "../keyDates.js";
import type * as lib_abstract from "../lib/abstract.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_content from "../lib/content.js";
import type * as lib_profile from "../lib/profile.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  abstracts: typeof abstracts;
  adminUsers: typeof adminUsers;
  announcements: typeof announcements;
  auth: typeof auth;
  http: typeof http;
  keyDates: typeof keyDates;
  "lib/abstract": typeof lib_abstract;
  "lib/auth": typeof lib_auth;
  "lib/content": typeof lib_content;
  "lib/profile": typeof lib_profile;
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

export declare const components: {};
