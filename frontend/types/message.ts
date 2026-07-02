export interface Message {
  id: string;
  orderId: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender?: { displayName: string; avatarUrl: string | null };
}
