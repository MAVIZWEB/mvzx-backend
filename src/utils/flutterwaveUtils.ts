import axios from 'axios';
const FLW_SECRET = process.env.FLW_SECRET_KEY;
export async function verifyTransaction(txId: string) {
  const url = `https://api.flutterwave.com/v3/transactions/${txId}/verify`;
  const r = await axios.get(url, { headers: { Authorization: `Bearer ${FLW_SECRET}` } });
  return r.data;
}
