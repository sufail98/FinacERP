const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'src/utils/prints/purchaseOrderPrints/purchaseOrderPrintTwo.js');
let content = fs.readFileSync(srcPath, 'utf8');

const modules = [
    {
        name: 'purchaseInvoice',
        dir: 'purchaseInvoicePrints',
        filename: 'purchaseInvoicePrintTwo.js',
        funcName: 'purchaseInvoicePrintTwo',
        exportName: 'purchaseInvoicePrintTwo',
        headingEn: 'PURCHASE INVOICE',
        headingAr: 'فاتورة الشراء',
        invoiceLabelEn: 'Invoice No:',
        invoiceLabelAr: 'رقم الفاتورة',
        tag: 'PURCHASE INVOICE',
        otherChargeField: 'othercharge'
    },
    {
        name: 'purchaseReturn',
        dir: 'purchaseReturnPrints',
        filename: 'purchaseReturnPrintTwo.js',
        funcName: 'purchaseReturnPrintTwo',
        exportName: 'purchaseReturnPrintTwo',
        headingEn: 'PURCHASE RETURN',
        headingAr: 'إرجاع المشتريات',
        invoiceLabelEn: 'Return No:',
        invoiceLabelAr: 'رقم الإرجاع',
        tag: 'PURCHASE RETURN',
        otherChargeField: 'othercharge' // Or whatever it is in purchaseReturnData
    },
    {
        name: 'materialReciept',
        dir: 'materialRecieptPrints',
        filename: 'materialRecieptPrintTwo.js',
        funcName: 'materialRecieptPrintTwo',
        exportName: 'materialRecieptPrintTwo',
        headingEn: 'MATERIAL RECEIPT',
        headingAr: 'إيصال استلام مواد',
        invoiceLabelEn: 'Receipt No:',
        invoiceLabelAr: 'رقم الإيصال',
        tag: 'MATERIAL RECEIPT',
        otherChargeField: 'othercharge'
    }
];

for (const mod of modules) {
    let newContent = content;

    // Replace the main function names
    newContent = newContent.replace(/export const generatePurchaseOrderHTML =/g, `export const generate${mod.name.charAt(0).toUpperCase() + mod.name.slice(1)}HTML =`);
    newContent = newContent.replace(/export const purchaseOrderPrintTwo =/g, `export const ${mod.funcName} =`);
    newContent = newContent.replace(/export const savePurchaseOrderAsPDF =/g, `export const save${mod.name.charAt(0).toUpperCase() + mod.name.slice(1)}AsPDF =`);
    newContent = newContent.replace(/export default purchaseOrderPrintTwo;/g, `export default ${mod.exportName};`);
    
    newContent = newContent.replace(/generatePurchaseOrderHTML/g, `generate${mod.name.charAt(0).toUpperCase() + mod.name.slice(1)}HTML`);
    
    // Replace headings
    newContent = newContent.replace(/const headingEn = 'PURCHASE ORDER';/g, `const headingEn = '${mod.headingEn}';`);
    newContent = newContent.replace(/const headingAr = 'أمر شراء';/g, `const headingAr = '${mod.headingAr}';`);
    
    newContent = newContent.replace(/<title>PURCHASE ORDER - \$\{invoiceNo\}<\/title>/g, `<title>${mod.headingEn} - \$\{invoiceNo\}<\/title>`);
    
    newContent = newContent.replace(/<span class="inv-label">Order No:<\/span>/g, `<span class="inv-label">${mod.invoiceLabelEn}<\/span>`);
    newContent = newContent.replace(/<span class="inv-label-ar">رقم الطلب<\/span>/g, `<span class="inv-label-ar">${mod.invoiceLabelAr}<\/span>`);
    newContent = newContent.replace(/Order No: \$\{invoiceNo\}/g, `${mod.invoiceLabelEn} \$\{invoiceNo\}`);

    // Replace [PURCHASE ORDER] with tag
    newContent = newContent.replace(/\[PURCHASE ORDER\]/g, `[${mod.tag}]`);

    // Fix OtherCharge to othercharge if needed
    if (mod.otherChargeField === 'othercharge') {
        newContent = newContent.replace(/OtherCharge = 0/g, `othercharge = 0`);
        newContent = newContent.replace(/OtherCharge\)/g, `othercharge)`);
        newContent = newContent.replace(/OtherCharge \|\|/g, `othercharge ||`);
    }

    // Write file
    const destDir = path.join(__dirname, 'src/utils/prints', mod.dir);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }
    const destPath = path.join(destDir, mod.filename);
    fs.writeFileSync(destPath, newContent);
    console.log('Created', destPath);
}
