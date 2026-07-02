export interface Payout {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
}

export interface VirtualAccount {
  accountNumber: string;
  bankName: string;
  accountName: string;
}
