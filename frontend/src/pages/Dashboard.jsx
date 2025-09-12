import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Dashboard(){
  const [me,setMe]=useState(null);
  useEffect(()=>{
    // Implement real auth later. Example: fetch user 1
    axios.get('/api/me').then(r=>setMe(r.data.user)).catch(()=>{});
  },[]);
  return (
    <div style={{padding:20}}>
      <h2>Dashboard</h2>
      <pre>{JSON.stringify(me, null, 2)}</pre>
    </div>
  )
}
