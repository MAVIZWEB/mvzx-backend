 import React, { useState } from 'react';
import axios from 'axios';

export default function Signup(){
  const [email,setEmail]=useState('');
  const [phone,setPhone]=useState('');
  const [pin,setPin]=useState('');
  const [ref,setRef]=useState('');
  const onSubmit=async(e)=>{
    e.preventDefault();
    const res = await axios.post('/api/auth/signup',{ email, phone, pin, referrerId: ref || undefined });
    alert('signed up: '+ JSON.stringify(res.data.user));
    window.location.href = '/dashboard';
  }
  return (
    <div style={{padding:20}}>
      <h2>MVZx Signup — Free 0.5 MVZx</h2>
      <form onSubmit={onSubmit}>
        <input placeholder='email' value={email} onChange={e=>setEmail(e.target.value)} /><br/>
        <input placeholder='phone' value={phone} onChange={e=>setPhone(e.target.value)} /><br/>
        <input placeholder='4-digit PIN' value={pin} onChange={e=>setPin(e.target.value)} /><br/>
        <input placeholder='referrer id (optional)' value={ref} onChange={e=>setRef(e.target.value)} /><br/>
        <button type='submit'>Signup</button>
      </form>
    </div>
  )
}
