const { firefox  } = require('playwright');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const ExcelJS = require('exceljs');

const csvWriter = createCsvWriter({
    path: 'results.csv',
    header: [
      { id: 'symbol', title: 'Symbol' },
      { id: 'pe', title: 'P/E' },
      { id: 'eps', title: 'EPS (ttm)' },
      { id: 'epsNext5', title: 'EPS next 5Y' },
      { id: 'price', title: 'Price' },
      { id: 'eps2', title: 'EPS 2' },
      { id: 'eps3', title: 'EPS 3' },
      { id: 'eps4', title: 'EPS 4' },
      { id: 'eps5', title: 'EPS 5' },
      { id: 'iv', title: 'IV' },
      { id: 'iv2', title: 'IV 2' },
      { id: 'iv3', title: 'IV 3' },
      { id: 'iv4', title: 'IV 4' },
      { id: 'iv5', title: 'IV 5' },
      { id: 'iv30', title: 'IV 30%'},
    ]
});

(async () => {
    const rateOfReturn = 0.15;
    const marginOfSafety = 0.70;

    const symbolsUrl = "https://finviz.com/screener.ashx?v=171&f=fa_curratio_o1,fa_debteq_u0.8,fa_eps5years_o10,fa_epsqoq_pos,fa_epsyoy_pos,fa_epsyoy1_pos,fa_estltgrowth_pos,fa_fpe_profitable,fa_grossmargin_o10,fa_netmargin_o10,fa_opermargin_o10,fa_pe_profitable,fa_ps_o1,fa_quickratio_o1,fa_roa_o10,fa_roe_o10,fa_roi_o10,fa_sales5years_o10,fa_salesqoq_pos,geo_usa&ft=4&o=rsi";
    const browser = await firefox.launch();
    const context = await browser.newContext();

    const page = await context.newPage({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        extraHTTPHeaders: { 
            'Cache-Control': 'no-cache' 
        } 
    });

    let allData = new Set(); 
    let r = 1; 
    let continuePaging = true;
    
    while (continuePaging) {
        const url = r === 1 ? symbolsUrl : `${symbolsUrl}&r=${r}`;
        await page.goto(url);
        const currentData = await extractDataFromPage(page);
        
        const hasDuplicates = currentData.some(symbol => allData.has(symbol));
        
        if (hasDuplicates) {
            continuePaging = false;
        } else {
            currentData.forEach(symbol => allData.add(symbol)); 
            r += 20; 
        }
    }
    
    const uniqueDataArray = Array.from(allData);

    const results = [];
    for (const symbol of uniqueDataArray) {         
        console.log(`symbol =>`, symbol); 
        await page.goto(`https://finviz.com/quote.ashx?t=${symbol}&p=d`);
        
        const data = await page.locator(".js-snapshot-table").evaluate(el => {
            return [...el.querySelectorAll("tbody tr td")].map(td => td.textContent);
        });
        
        const result = {};
        data.forEach((item, i) => {
            if (i % 2 === 0 && i + 1 < data.length) {
                result[item] = data[i + 1];
            }
        });

        const pe = result['P/E'];
        const eps = result['EPS (ttm)'];
        const epsNext5 = result['EPS next 5Y'];
        const price = result['Price'];

        const eps2 = (parseFloat(eps) + (parseFloat(eps) * (parseFloat(epsNext5) / 100))).toFixed(2).toString();
        const eps3 = (parseFloat(eps2) + (parseFloat(eps2) * (parseFloat(epsNext5) / 100))).toFixed(2).toString();
        const eps4 = (parseFloat(eps3) + (parseFloat(eps3) * (parseFloat(epsNext5) / 100))).toFixed(2).toString();
        const eps5 = (parseFloat(eps4) + (parseFloat(eps4) * (parseFloat(epsNext5) / 100))).toFixed(2).toString();

        const iv5 =  (parseFloat(eps5) *  parseFloat(pe)).toFixed(2);
        const iv4 =  (parseFloat(iv5) /  (1 + parseFloat(rateOfReturn))).toFixed(2).toString();
        const iv3 =  (parseFloat(iv4) /  (1 + parseFloat(rateOfReturn))).toFixed(2).toString();
        const iv2 =  (parseFloat(iv3) /  (1 + parseFloat(rateOfReturn))).toFixed(2).toString();
        const iv =  (parseFloat(iv2) /  (1 + parseFloat(rateOfReturn))).toFixed(2).toString();

        const iv30 = (parseFloat(iv) * parseFloat(marginOfSafety)).toFixed(2).toString();
        
        results.push({ 
            symbol,
            pe,
            eps,
            epsNext5,
            price ,
            eps2,
            eps3,
            eps4,
            eps5,
            iv,
            iv2,
            iv3,
            iv4,
            iv5,
            iv30
        });
        await page.waitForTimeout(2000);
    };

    await browser.close();

    const sortedResults = results.sort((a, b) => parseFloat(b.iv) - parseFloat(a.iv)
     || parseFloat(a.price) - parseFloat(b.price));

    await csvWriter.writeRecords(sortedResults); 

    await generateExcel(sortedResults);
})();

async function extractDataFromPage(page) {
    return await page.evaluate(() => {
      return Array.from(document.querySelectorAll('table.styled-table-new tr')).map(row => {
        const col = row.querySelector('td a.tab-link');
        return col ? col.innerText : ''; 
      }).filter(text => text !== ''); 
    });
}

async function generateExcel(dataSet) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('New Sheet');
    
    worksheet.columns = [
        { key: 'symbol', header: 'Symbol' },
        { key: 'pe', header: 'P/E' },
        { key: 'eps', header: 'EPS (ttm)' },
        { key: 'epsNext5', header: 'EPS next 5Y' },
        { key: 'price', header: 'Price' },
        { key: 'eps2', header: 'EPS 2' },
        { key: 'eps3', header: 'EPS 3' },
        { key: 'eps4', header: 'EPS 4' },
        { key: 'eps5', header: 'EPS 5' },
        { key: 'iv', header: 'IV' },
        { key: 'iv2', header: 'IV 2' },
        { key: 'iv3', header: 'IV 3' },
        { key: 'iv4', header: 'IV 4' },
        { key: 'iv5', header: 'IV 5' },
        { key: 'iv30', header: 'IV 30%' },
    ];

    let countBelow = 0;
    let countAboveOrEqual = 0;
    let totalCompanies = dataSet.length;

    dataSet.forEach((e) => {
        const row = worksheet.addRow({
            symbol: e.symbol, 
            pe: e.pe,
            eps: e.eps,
            epsNext5: e.epsNext5,
            price: e.price,
            eps2: e.eps2,
            eps3: e.eps3,
            eps4: e.eps4,
            eps5: e.eps5,
            iv: e.iv,
            iv2: e.iv2,
            iv3: e.iv3,
            iv4: e.iv4,
            iv5: e.iv5,
            iv30: e.iv30
        });

        if (parseFloat(e.price) < parseFloat(e.iv)) {
            row.getCell('price').fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF00FF00' } 
            };

            row.getCell('iv').fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF00FF00' } 
            };
            countBelow++;
        } else {
            countAboveOrEqual++;
        }
    });

    const chartDataSheet = workbook.addWorksheet('Chart Data');
    chartDataSheet.addRow(['Category', '%']);
    chartDataSheet.addRow(['Price < IV', (parseFloat(countBelow * 100) / parseFloat(totalCompanies)).toFixed(2)]);
    chartDataSheet.addRow(['Price >= IV', (parseFloat(countAboveOrEqual * 100) / parseFloat(totalCompanies)).toFixed(2)]);

    await workbook.xlsx.writeFile("results.xlsx");
}

