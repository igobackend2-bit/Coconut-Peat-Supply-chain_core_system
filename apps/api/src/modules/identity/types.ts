/** Attached to the request by SessionAuthGuard; read by PermissionsGuard and controllers. */
export interface RequestUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}
