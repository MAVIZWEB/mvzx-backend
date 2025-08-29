import axios from "axios";
import { env } from "../utils/env";

const FLW_BASE = "https://api.flutterwave.com/v3";
const headers = { Authorization: `Bearer ${env.FLW_SECRET_KEY}` };

export async function flwInitializeNGN(amountNGN: number, email: string, txRef: string) {
  const payload = {
    tx_ref: txRef,
    amount: Math.round(amountNGN),
    currency: "NGN",
    redirect_url: `${env.FRONTEND_URL}/purchase`,
    customer: { email },
    customization: { title: "MVZx Token Purchase" }
  };
  const { data } = await axios.post(`${FLW_BASE}/payments`, payload, { headers });
  return data; // contains link to hosted payment
}

export async function flwVerify(txId: string) {
  const { data } = await axios.get(`${FLW_BASE}/transactions/${txId}/verify`, { headers });
  return data;
}
