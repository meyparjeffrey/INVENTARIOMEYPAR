#!/usr/bin/env node
// Script que simula signtool.exe para evitar errores de firma
// electron-builder lo llamará pero no hará nada

console.log('Skipping code signing (no certificate configured)...');
process.exit(0);
