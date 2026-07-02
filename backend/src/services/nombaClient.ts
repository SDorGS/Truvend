import fetch from 'node-fetch';

const NOMBA_BASE = process.env.NOMBA_API_BASE || 'https://api.nomba.com';

function authHeader() {
  const token = process.env.NOMBA_API_TOKEN;
  if (!token) throw new Error('NOMBA_API_TOKEN not set');
  return { Authorization: `Bearer ${token}` };
}

export async function createCheckoutOrder(payload: unknown) {
  const res = await fetch(`${NOMBA_BASE}/v1/checkout/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Nomba createCheckoutOrder failed: ${res.status} ${err}`);
  }

  return res.json();
}

export async function fetchCheckoutTransaction(id: string, idType: 'ORDER_ID' | 'ORDER_REFERENCE' = 'ORDER_ID') {
  const url = new URL(`${NOMBA_BASE}/v1/checkout/transaction`);
  url.searchParams.set('id', id);
  url.searchParams.set('idType', idType);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      ...authHeader(),
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Nomba fetchCheckoutTransaction failed: ${res.status} ${err}`);
  }

  return res.json();
}

export async function createVirtualAccount(payload: unknown) {
  const res = await fetch(`${NOMBA_BASE}/v1/accounts/virtual`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Nomba createVirtualAccount failed: ${res.status} ${err}`);
  }

  return res.json();
}

export async function fetchVirtualAccount(identifier: string) {
  const res = await fetch(`${NOMBA_BASE}/v1/accounts/virtual/${encodeURIComponent(identifier)}`, {
    method: 'GET',
    headers: {
      ...authHeader(),
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Nomba fetchVirtualAccount failed: ${res.status} ${err}`);
  }

  return res.json();
}

export default {
  createCheckoutOrder,
  fetchCheckoutTransaction,
  createVirtualAccount,
  fetchVirtualAccount,
};
