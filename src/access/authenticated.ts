import type { Access } from "payload";

/** True only for a request carrying a real, logged-in Payload user (i.e. someone signed into /admin). */
export const authenticated: Access = ({ req: { user } }) => Boolean(user);
