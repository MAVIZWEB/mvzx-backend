import React, { useState } from 'react';
import axios from 'axios';

export default function Purchase(){
  const [userId, setUserId] = useState('1');
  const [amount, setAmount] = useState('2000');
  const onBuy = async ()=>{
    const res = await axios.post('/api/purchase/create',{ userId: Number(userId), amountNGN: Number(amount), method: 'FLUTTERWAVE' });
    alert('purchase created: '+ JSON.stringify(res.data.purchase));
  }
  return (
    <div style={{padding:20}}>
      <h3>Buy MVZx</h3>
      <input value={userId} onChange={e=>setUserId(e.target.value)} placeholder='userId'/><br/>
      <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder='amount NGN'/><br/>
      <button onClick={onBuy}>Buy (create purchase)</button>
    </div>
  )
}
