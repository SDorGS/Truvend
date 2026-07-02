
export type UserRole =
  | "buyer"
  | "seller"
  | "admin";

export interface User {
  id: string;

  name: string;

  email: string;

  avatar?: string;

  role: UserRole;

  verified: boolean;
}


====================================================================================================
