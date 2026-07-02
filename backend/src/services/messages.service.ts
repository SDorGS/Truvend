import { supabase } from '../lib/supabase'
import { AppError } from '../middleware/error.middleware'

// Run this SQL once in Supabase before using these endpoints:
//
//   CREATE TABLE messages (
//     id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//     order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
//     sender_id  UUID NOT NULL REFERENCES users(id),
//     body       TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 2000),
//     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
//     read_at    TIMESTAMPTZ
//   );
//   CREATE INDEX idx_messages_order_id ON messages(order_id, created_at);

export interface Message {
  id: string
  order_id: string
  sender_id: string
  body: string
  created_at: string
  read_at: string | null
  sender?: { display_name: string; avatar_url: string | null }
}

// Both buyer and seller on the order can access — throws 403 otherwise, 404 if the order is unknown.
async function assertPartyToOrder(orderId: string, userId: string): Promise<void> {
  const { data: order, error } = await supabase
    .from('orders')
    .select('buyer_id, listing_id')
    .eq('id', orderId)
    .single()

  if (error || !order) throw new AppError(404, 'NOT_FOUND', 'Order not found.')

  if (order.buyer_id === userId) return

  const { data: listing } = await supabase
    .from('listings')
    .select('seller_id')
    .eq('id', order.listing_id)
    .single()

  if (!listing || listing.seller_id !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You are not a party to this order.')
  }
}

export async function getOrderMessages(orderId: string, userId: string): Promise<Message[]> {
  await assertPartyToOrder(orderId, userId)

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[messages] getOrderMessages:', error)
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch messages.')
  }

  const messages = (data ?? []) as Message[]

  // Attach sender display info
  try {
    for (const m of messages) {
      const { data: sender } = await supabase
        .from('users')
        .select('display_name, avatar_url')
        .eq('id', m.sender_id)
        .single()

      if (sender) {
        ;(m as any).sender = { display_name: sender.display_name, avatar_url: sender.avatar_url }
      }
    }
  } catch (e) {
    console.warn('[messages] getOrderMessages: failed to attach sender info', e)
  }

  return messages
}

export async function sendMessage(
  orderId: string,
  senderId: string,
  body: string
): Promise<Message> {
  const trimmed = body.trim()
  if (!trimmed) throw new AppError(400, 'INVALID_INPUT', 'Message body is required.')
  if (trimmed.length > 2000) {
    throw new AppError(400, 'INVALID_INPUT', 'Messages are limited to 2000 characters.')
  }

  await assertPartyToOrder(orderId, senderId)

  const { data, error } = await supabase
    .from('messages')
    .insert({ order_id: orderId, sender_id: senderId, body: trimmed })
    .select()
    .single()

  if (error || !data) {
    console.error('[messages] sendMessage:', error)
    throw new AppError(500, 'DB_ERROR', 'Failed to send message.')
  }

  return data as Message
}
