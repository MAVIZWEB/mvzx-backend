import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Purchase from './pages/Purchase';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path='/' element={<Signup/>} />
      <Route path='/dashboard' element={<Dashboard/>} />
      <Route path='/purchase' element={<Purchase/>} />
    </Routes>
  </BrowserRouter>
);
