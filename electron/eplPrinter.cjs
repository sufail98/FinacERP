const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function getPrinterPort(printerName) {
  return new Promise((resolve) => {
    if (typeof printerName !== 'string' || !printerName.trim()) {
      console.warn('⚠️ [EPL] getPrinterPort called with invalid printerName:', printerName);
      return resolve(null);
    }
    const safeName = printerName.replace(/'/g, "''");
    const psCmd = `powershell -NoProfile -Command "(Get-Printer -Name '${safeName}').PortName"`;
    exec(psCmd, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ [EPL] Port lookup error:', error.message);
        return resolve(null);
      }
      resolve((stdout || '').trim() || null);
    });
  });
}

async function printRawEpl(eplCommands, printerName) {
  console.log('🖨️ [EPL] printRawEpl called. printerName =', JSON.stringify(printerName));
  console.log('🖨️ [EPL] EPL payload:\n', eplCommands);

  if (!printerName) {
    console.error('❌ [EPL] No printer name provided');
    return { success: false, error: 'No printer name provided for raw EPL print' };
  }

  const tmpFile = path.join(os.tmpdir(), `epl_label_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);
  console.log('🖨️ [EPL] Writing temp file:', tmpFile);

  try {
    fs.writeFileSync(tmpFile, eplCommands, 'binary');
    console.log('✅ [EPL] Temp file written, size:', fs.statSync(tmpFile).size, 'bytes');
  } catch (err) {
    console.error('❌ [EPL] Failed to write temp file:', err.message);
    return { success: false, error: `Failed to write EPL temp file: ${err.message}` };
  }

  const runCopy = (target) =>
    new Promise((resolve) => {
      const cmd = `cmd /c copy /B "${tmpFile}" "${target}"`;
      console.log('🖨️ [EPL] Running:', cmd);
      exec(cmd, (error, stdout, stderr) => {
        console.log('🖨️ [EPL] copy stdout:', JSON.stringify(stdout));
        console.log('🖨️ [EPL] copy stderr:', JSON.stringify(stderr));
        if (error) {
          console.error('❌ [EPL] copy exec error:', error.message);
          return resolve({ success: false, error: stderr || error.message });
        }
        // ✅ copy /B can exit code 0 while printing "0 file(s) copied" if the
        // target port silently rejected it — check stdout text, not just exit code
        if (stdout && /0 file\(s\) copied/i.test(stdout)) {
          console.error('❌ [EPL] copy reported 0 files copied despite exit 0 — target likely invalid:', target);
          return resolve({ success: false, error: `copy reported 0 files copied to "${target}"` });
        }
        resolve({ success: true });
      });
    });

  try {
    const port = await getPrinterPort(printerName);
    if (port) {
      const portResult = await runCopy(port);
      if (portResult.success) {
        console.log('✅ [EPL] Successfully sent to port:', port);
        return { success: true };
      }
      console.error(`❌ [EPL] Port copy failed on "${port}":`, portResult.error);
    } else {
      console.warn('⚠️ [EPL] No port resolved, skipping straight to share fallback');
    }

    const shareTarget = `\\\\localhost\\${printerName}`;
    const shareResult = await runCopy(shareTarget);
    if (shareResult.success) {
      console.log('✅ [EPL] Successfully sent to share:', shareTarget);
      return { success: true };
    }

    console.error('❌ [EPL] Both port and share copy failed');
    return {
      success: false,
      error: `Both port and share copy failed. Port tried: "${port || '(none)'}", ` +
             `share tried: "${shareTarget}". Last error: ${shareResult.error}`,
    };
  } finally {
    fs.unlink(tmpFile, () => {});
  }
}

function buildEplLabel(opts) {
  const {
    widthMM, heightMM,
    branchName, productName, barcode, price, supplierCode,
    showBranchName, showProductName, showSupplierCode,
  } = opts;

  const DOTS_PER_MM = 8;
  const widthDots = Math.round(widthMM * DOTS_PER_MM);
  const heightDots = Math.round(heightMM * DOTS_PER_MM);
  const gapDots = 24;

  const escapeEpl = (str) => (str || '').replace(/["\\]/g, '');

  let y = 10;
  const lines = [];
  lines.push('N');
  lines.push(`q${widthDots}`);
  lines.push(`Q${heightDots},${gapDots}`);

  if (showBranchName && branchName) {
    lines.push(`A10,${y},0,3,1,1,N,"${escapeEpl(branchName).toUpperCase()}"`);
    y += 25;
  }
  if (showProductName && productName) {
    lines.push(`A10,${y},0,2,1,1,N,"${escapeEpl(productName).toUpperCase()}"`);
    y += 20;
  }

  lines.push(`B10,${y},0,1,2,2,50,N,"${escapeEpl(barcode)}"`);
  y += 60;
  lines.push(`A10,${y},0,2,1,1,N,"${escapeEpl(barcode)}"`);
  y += 20;

  if (price) {
    lines.push(`A10,${y},0,3,1,1,N,"${Number(price).toFixed(2)}"`);
  }
  if (showSupplierCode && supplierCode) {
    const xRight = widthDots - 100;
    lines.push(`A${xRight > 10 ? xRight : 10},${y},0,2,1,1,N,"${escapeEpl(supplierCode)}"`);
  }

  lines.push('P1');
  return lines.join('\n') + '\n';
}

module.exports = { printRawEpl, buildEplLabel };