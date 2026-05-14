#!/usr/bin/env node

/**
 * Script de línea de comandos para ejecutar pruebas internas
 * Uso: node scripts/runTests.js
 */

import { runAllTests } from '../src/utils/internalTests.js';

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║   🔍 SUITE DE PRUEBAS INTERNAS - CREPE WORKING               ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

(async () => {
  try {
    const results = await runAllTests();
    
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║   📊 RESUMEN EJECUTIVO                                        ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    console.log(`  Total de Pruebas: ${results.summary.total}`);
    console.log(`  ✅ Pasadas:       ${results.summary.passed}`);
    console.log(`  ❌ Fallidas:      ${results.summary.failed}`);
    console.log(`  ⚠️  Advertencias:  ${results.summary.warnings}`);
    console.log(`  ⏱️  Duración:      ${(results.summary.duration / 1000).toFixed(2)}s`);
    
    console.log('\n╭───────────────────────────────────────────────────────────────╮');
    console.log('│   DETALLES POR PRUEBA                                         │');
    console.log('╰───────────────────────────────────────────────────────────────╯\n');
    
    results.details.forEach((test, index) => {
      const icon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️';
      console.log(`  ${icon} [${test.category}] ${test.name} (${test.duration}ms)`);
      
      if (test.error) {
        console.log(`     └─ Error: ${test.error.message || JSON.stringify(test.error)}`);
      }
    });
    
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log(`║   ${results.summary.failed === 0 ? '✅ TODAS LAS PRUEBAS PASARON' : '❌ ALGUNAS PRUEBAS FALLARON'}                                   ║`);
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    // Salir con código de error si hay fallos
    process.exit(results.summary.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n❌ Error fatal ejecutando pruebas:', error);
    process.exit(1);
  }
})();
