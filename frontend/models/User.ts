import { User as UserType } from "@/types/user";

export default class User implements UserType {
  id!: string;
  name!: string;
  email!: string;
  avatar?: string;
  role!: UserType["role"];
  verified!: boolean;

  constructor(data: UserType) {
    Object.assign(this, data);
  }

  clone(): User {
    return new User({
      ...this,
    });
  }
}
