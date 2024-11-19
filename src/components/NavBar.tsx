import { AppBar, Toolbar } from '@mui/material';
import React from 'react';
import Link from 'next/link';

function MyAppBar() {
  const toolbarStyles = {
    display: 'flex',
    justifyContent: 'space-around',
  };
  
  const linkStyles = {
    textDecoration: 'none',
    color: 'white',
    margin: '0 16px',
    fontWeight: "700",
    fontFamily:'Roboto',
  };
  return (
    <AppBar position="fixed"  style={{ top: 0, height: '64px', zIndex: 1,background: "#202932"}}>
    <Toolbar sx={toolbarStyles}>
      <Link style={linkStyles} href="/">
        Registrar faltas e presenças
      </Link>
      <Link style={linkStyles} href="/filtroPeriodo">
        Verificar faltas por periodo
      </Link>
      
     
    </Toolbar>
  </AppBar>
  );
}

export default MyAppBar;
