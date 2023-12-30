const express = require('express');
const router = express.Router();

const bcrypt = require('bcryptjs');
const passport = require('passport');

const path = require('path');
const db = require("../models");

const Op = db.Sequelize.Op;

const readXlsxFile = require('read-excel-file/node');
var Json2csvParser = require('json2csv').Parser;
const { v4: uuidv4 } = require('uuid');
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');
const { json } = require('express');

router.post('/searchreport', ensureAuthenticated,async (req, res) =>{
 const {reporttype,inventoryname,quantity,inventorynamels,salesshop} = req.body;
 const warelist = await db.Warehouse.findAll({})
 const shoplist = await db.Shop.findAll({})
 const inventory = await db.Inventory.findAll({})
 const salesdata = await db.SalesData.findAll({})
 const medicinecategory = await db.MedicineCategory.findAll({});
  const medicinegenericiname = await db.MedicineGenericName.findAll({});
  const medicinelist = await db.MedicineInfo.findAll({});
  if(reporttype ==="IOH"){
  
// SQL query to calculate the total product units and current stock value by store
const sqlQuery = `
SELECT 
    Inventories.*,medicinename,medicinecategoryname,genericname,suppliertype,
    COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM Inventories
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid

LEFT JOIN Shops ON Shops.shopid = Inventories.warehouseid
LEFT JOIN Warehouses ON Warehouses.invid = Inventories.warehouseid
WHERE warehouseid = '${inventoryname}';

  
`;
console.log(sqlQuery)
// Execute the SQL query
db.sequelize.query(sqlQuery, { type: db.Sequelize.QueryTypes.SELECT })
  .then(results => {
    // Process the query results (results) here
   
    res.render('adminreportIOH',{inventory:results,
      medicinecategory:medicinecategory,
      medicinegenericiname:medicinegenericiname,
      medicinelist:medicinelist,inventoryname:inventoryname,
      warelist:warelist,shoplist:shoplist,user:req.user})
  })
  .catch(error => {
    // Handle any errors here
    console.log(error)
    res.render('adminreportIOH',{inventory:inventory,
      medicinecategory:medicinecategory,
      medicinegenericiname:medicinegenericiname,
      medicinelist:medicinelist,inventoryname:inventoryname,
      warelist:warelist,shoplist:shoplist,user:req.user})
  });
  }else if(reporttype ==="LS"){
    const sqlQuery = `
SELECT 
    Inventories.*,medicinename,medicinecategoryname,genericname,suppliertype,
    COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM Inventories
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid

LEFT JOIN Shops ON Shops.shopid = Inventories.warehouseid
LEFT JOIN Warehouses ON Warehouses.invid = Inventories.warehouseid
WHERE quantity < '${quantity}';

  
`;
console.log(sqlQuery)
// Execute the SQL query
db.sequelize.query(sqlQuery, { type: db.Sequelize.QueryTypes.SELECT })
  .then(results => {
    // Process the query results (results) here
   
    res.render('adminreportLS',{inventory:results,
      medicinecategory:medicinecategory,
      medicinegenericiname:medicinegenericiname,
      medicinelist:medicinelist,inventoryname:inventorynamels,
      warelist:warelist,shoplist:shoplist,user:req.user})
  })
  .catch(error => {
    // Handle any errors here
    console.log(error)
    res.render('adminreportLS',{inventory:inventory,
      medicinecategory:medicinecategory,
      medicinegenericiname:medicinegenericiname,
      medicinelist:medicinelist,inventoryname:inventoryname,
      warelist:warelist,shoplist:shoplist,user:req.user})
  });
  }else if(reporttype ==="SR"){
    const salesDataByDate = [];
    function getDayOfWeek(date, timeZone = 'Africa/Nairobi') {
      const options = { weekday: 'long' }; // or 'short' for abbreviated names
    
      return date.toLocaleDateString('en-US', { timeZone, ...options });
    }
    function formatDateTime(date, timeZone = 'Africa/Nairobi') {
      const options = {
        timeZone: timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      };
    
      return date.toLocaleString('en-US', options).replace(/(\d+)\/(\d+)\/(\d+),?/, '$3-$1-$2');
    }
    function getLast7Days() {
      const currentDate = new Date();
      const last7Days = [];
    
      for (let i = 7; i >= 0; i--) {
        const startOfDay = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate() - i,
          3, // Set hours to 6:00 AM
          0,
          0,
          0
        );
    
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);
        endOfDay.setSeconds(endOfDay.getSeconds() - 1);
    
        last7Days.push({
          start: startOfDay,
          end: endOfDay,
        });
      }
    
      return last7Days;
    }
    
    // Example usage
    const last7Days = getLast7Days();
    for (const day of last7Days) {
      const startDate = day.start;
      const endDate = day.end;
    const [salesByDate, salesMetadata] = await db.sequelize.query(`
    SELECT 
      sum(SalesData.totalpayable) as quantity
    FROM SalesData
    WHERE SalesData.createdAt BETWEEN '${formatDateTime(startDate)}' AND '${formatDateTime(endDate)}'
    
  `);
  
  
  salesDataByDate.push({
    dayofweek:getDayOfWeek(startDate),
    fromdate: formatDateTime(startDate),
    enddate: formatDateTime(endDate),
    sales: salesByDate[0].quantity || 0,
  });
    }
    const [todaysalesbyshop,dm] =await db.sequelize.query(`
select Shops.shopname,sum(SalesData.totalpayable) as quantity  from  SalesData

inner join Shops on SalesData.shopid = Shops.shopid
 group by Shops.shopname

`);
const [todaysalesbyquantity,dmq] =await db.sequelize.query(`
select medicinename,sum(SalesData.quantity) as quantity  from  SalesData

inner join MedicineInfos on MedicineInfos.medid = SalesData.medicineid
 group by medicinename order by quantity desc limit 5

`)
const [todaysalesbyvalue,dmv] =await db.sequelize.query(`
select medicinename,sum(SalesData.totalpayable) as quantity  from  SalesData

inner join MedicineInfos on MedicineInfos.medid = SalesData.medicineid
 group by medicinename order by quantity desc limit 5

`);
    const sqlQuery = `
SELECT 
    SalesData.*,medicinename,medicinecategoryname,genericname,
   Shops.shopname AS location_name
FROM SalesData
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid

LEFT JOIN Shops ON Shops.shopid = SalesData.shopid
WHERE SalesData.shopid = '${salesshop}'
order by createdAt desc

  
`;
console.log(sqlQuery)
// Execute the SQL query
db.sequelize.query(sqlQuery, { type: db.Sequelize.QueryTypes.SELECT })
  .then(results => {
    // Process the query results (results) here
   
    res.render('adminreportSR',{salesdata:results,
      medicinecategory:medicinecategory,
      todaysalesbyvalue:todaysalesbyvalue,
    salesDataByDate: salesDataByDate,
    todaysalesbyquantity:todaysalesbyquantity, 
    todaysalesbyshop:todaysalesbyshop,
      medicinegenericiname:medicinegenericiname,
      medicinelist:medicinelist,inventoryname:salesshop,
      warelist:warelist,shoplist:shoplist,user:req.user})
  })
  .catch(error => {
    // Handle any errors here
    console.log(error)
    res.render('adminreportSR',{salesdata:salesdata,
      medicinecategory:medicinecategory,
      todaysalesbyvalue:todaysalesbyvalue,
      salesDataByDate: salesDataByDate,
      todaysalesbyquantity:todaysalesbyquantity, 
      todaysalesbyshop:todaysalesbyshop,
      medicinegenericiname:medicinegenericiname,
      medicinelist:medicinelist,inventoryname:salesshop,
      warelist:warelist,shoplist:shoplist,user:req.user})
  });
  }
 
} );
router.post('/searchfilterinventoryonhand', ensureAuthenticated,async (req, res) => {
  const { medicinename,inventoryname, expirydate, quantity } = req.body;
  const warelist = await db.Warehouse.findAll({})
  const shoplist = await db.Shop.findAll({})
  const inventory = await db.Inventory.findAll({})
  const medicinecategoryes = await db.MedicineCategory.findAll({});
   const medicinegenericiname = await db.MedicineGenericName.findAll({});
   const medicinelist = await db.MedicineInfo.findAll({});
  // Start building the SQL query
  let sqlQuery = `
  SELECT 
    Inventories.*,medicinename,medicinecategoryname,genericname,suppliertype,
    COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM Inventories
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid

LEFT JOIN Shops ON Shops.shopid = Inventories.warehouseid
LEFT JOIN Warehouses ON Warehouses.invid = Inventories.warehouseid
where warehouseid = '${inventoryname}' 
  `;
  function isValidDate(dateString) {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }
  // Add conditions based on input values
  if (medicinename !== '0') {
    sqlQuery += ` AND medicineid = '${medicinename}'`;
  }


  if (expirydate && !isValidDate(expirydate)) {
    sqlQuery += ` AND expirydate <= '${expirydate}'`;
  }

  if (quantity) {
    sqlQuery += ` AND quantity < ${quantity}`;
  }
console.log(sqlQuery)
  // Execute the SQL query using your database connection
  // (Replace this with your actual database query code)
  const [results,rm]  = await db.sequelize.query(sqlQuery);
  if (!results) {
    console.log(error)
    res.render('adminreportIOH',{inventory:'',
      medicinecategory:medicinecategoryes,
      medicinegenericiname:medicinegenericiname,
      medicinelist:medicinelist,inventoryname:inventoryname,
      warelist:warelist,shoplist:shoplist,user:req.user})
  } else {
    // Send the filtered inventory data to the client
    res.render('adminreportIOH',{inventory:results,
      medicinecategory:medicinecategoryes,
      medicinegenericiname:medicinegenericiname,
      medicinelist:medicinelist,inventoryname:inventoryname,
      warelist:warelist,shoplist:shoplist,user:req.user})
  }
});
router.post('/searchfilterlowinventory', ensureAuthenticated,async (req, res) => {
  const { medicinename, inventoryname, expirydate, quantity } = req.body;
  const warelist = await db.Warehouse.findAll({})
  const shoplist = await db.Shop.findAll({})
 
  const medicinecategoryes = await db.MedicineCategory.findAll({});
   const medicinegenericiname = await db.MedicineGenericName.findAll({});
   const medicinelist = await db.MedicineInfo.findAll({});
  // Start building the SQL query
  let sqlQuery = `
  SELECT 
    Inventories.*,medicinename,medicinecategoryname,genericname,suppliertype,
    COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM Inventories
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid

LEFT JOIN Shops ON Shops.shopid = Inventories.warehouseid
LEFT JOIN Warehouses ON Warehouses.invid = Inventories.warehouseid
where warehouseid = '${inventoryname}' 
  `;
  function isValidDate(dateString) {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }
  // Add conditions based on input values
  if (medicinename !== '0') {
    sqlQuery += ` AND medicineid = '${medicinename}'`;
  }

  
  if (expirydate && !isValidDate(expirydate)) {
    sqlQuery += ` AND expirydate <= '${expirydate}'`;
  }

  if (quantity) {
    sqlQuery += ` AND quantity < ${quantity}`;
  }
console.log(sqlQuery)
  // Execute the SQL query using your database connection
  // (Replace this with your actual database query code)
  const [results,rm]  = await db.sequelize.query(sqlQuery);
  if (!results) {
    console.log(error)
    res.render('adminreportLS',{inventory:'',
      medicinecategory:medicinecategoryes,
      medicinegenericiname:medicinegenericiname,
      medicinelist:medicinelist,inventoryname:inventoryname,
      warelist:warelist,shoplist:shoplist,user:req.user})
  } else {
    // Send the filtered inventory data to the client
    res.render('adminreportLS',{inventory:results,
      medicinecategory:medicinecategoryes,
      medicinegenericiname:medicinegenericiname,
      medicinelist:medicinelist,inventoryname:inventoryname,
      warelist:warelist,shoplist:shoplist,user:req.user})
  }
});
router.post('/searchfiltersalesreport', ensureAuthenticated,async (req, res) => {
  const {startdate,inventoryname, enddate, quantity } = req.body;
  const warelist = await db.Warehouse.findAll({})
  const shoplist = await db.Shop.findAll({})
  const salesdata = await db.SalesData.findAll({})
  const medicinecategoryes = await db.MedicineCategory.findAll({});
   const medicinegenericiname = await db.MedicineGenericName.findAll({});
   const medicinelist = await db.MedicineInfo.findAll({});
  // Start building the SQL query
  const salesDataByDate = [];
function getDayOfWeek(date, timeZone = 'Africa/Nairobi') {
  const options = { weekday: 'long' }; // or 'short' for abbreviated names

  return date.toLocaleDateString('en-US', { timeZone, ...options });
}
function formatDateTime(date, timeZone = 'Africa/Nairobi') {
  const options = {
    timeZone: timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  };

  return date.toLocaleString('en-US', options).replace(/(\d+)\/(\d+)\/(\d+),?/, '$3-$1-$2');
}
function getLast7Days() {
  const currentDate = new Date();
  const last7Days = [];

  for (let i = 7; i >= 0; i--) {
    const startOfDay = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() - i,
      3, // Set hours to 6:00 AM
      0,
      0,
      0
    );

    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    endOfDay.setSeconds(endOfDay.getSeconds() - 1);

    last7Days.push({
      start: startOfDay,
      end: endOfDay,
    });
  }

  return last7Days;
}

// Example usage
const last7Days = getLast7Days();
for (const day of last7Days) {
  const startDate = day.start;
  const endDate = day.end;
const [salesByDate, salesMetadata] = await db.sequelize.query(`
SELECT 
  sum(SalesData.totalpayable) as quantity
FROM SalesData
WHERE SalesData.createdAt BETWEEN '${formatDateTime(startDate)}' AND '${formatDateTime(endDate)}'

`);


salesDataByDate.push({
dayofweek:getDayOfWeek(startDate),
fromdate: formatDateTime(startDate),
enddate: formatDateTime(endDate),
sales: salesByDate[0].quantity || 0,
});
}
let sqlQuery = `
SELECT 
SalesData.*,medicinename,medicinecategoryname,genericname,
Shops.shopname AS location_name
FROM SalesData
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid

LEFT JOIN Shops ON Shops.shopid = SalesData.shopid
WHERE SalesData.shopid = '${inventoryname}' 
`;
function isValidDate(dateString) {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

console.log(startdate)
console.log(!isValidDate(startdate))
if (startdate && isValidDate(startdate)) {
  sqlQuery += ` AND SalesData.createdAt >= '${startdate}'`;
}
if (enddate && isValidDate(enddate)) {
  sqlQuery += ` AND SalesData.createdAt <= '${enddate}'`;
}

if (quantity) {
  sqlQuery += ` AND quantity < ${quantity}`;
}
sqlQuery +=` order by createdAt desc`
if(!enddate || !startdate ){
  const [salelist, sdlm] = await db.sequelize.query(`
  SELECT  SalesData.*,medicinename,fullname,shopname
  FROM SalesData
  inner join Users on staffid = soldby
  inner join Shops on SalesData.shopid= Shops.shopid
  INNER JOIN MedicineInfos ON SalesData.medicineid = MedicineInfos.medid
  order by createdAt desc
  `);
  const [todaysalesbyshop,dm] =await db.sequelize.query(`
  select Shops.shopname,sum(SalesData.totalpayable) as quantity  from  SalesData
  
  inner join Shops on SalesData.shopid = Shops.shopid
   group by Shops.shopname
  
  `);
  const [todaysalesbyquantity,dmq] =await db.sequelize.query(`
  select medicinename,sum(SalesData.quantity) as quantity  from  SalesData
  
  inner join MedicineInfos on MedicineInfos.medid = SalesData.medicineid
   group by medicinename order by quantity desc limit 5
  
  `)
  const [todaysalesbyvalue,dmv] =await db.sequelize.query(`
  select medicinename,sum(SalesData.totalpayable) as quantity  from  SalesData
  
  inner join MedicineInfos on MedicineInfos.medid = SalesData.medicineid
   group by medicinename order by quantity desc limit 5
  
  `);
  const [results,rm]  = await db.sequelize.query(sqlQuery);
  if (!results) {
    console.log(error)
    res.render('adminreportSR',{salesdata:'',
      medicinecategory:medicinecategoryes,
      medicinegenericiname:medicinegenericiname,
      todaysalesbyvalue:todaysalesbyvalue,
      salesDataByDate: salesDataByDate,
      todaysalesbyquantity:todaysalesbyquantity, 
      todaysalesbyshop:todaysalesbyshop,
      medicinelist:medicinelist,inventoryname:inventoryname,
      warelist:warelist,shoplist:shoplist,user:req.user})
  } else {
    // Send the filtered inventory data to the client
    res.render('adminreportSR',{salesdata:results,
      medicinecategory:medicinecategoryes,
      medicinegenericiname:medicinegenericiname,
      todaysalesbyvalue:todaysalesbyvalue,
      salesDataByDate: salesDataByDate,
      todaysalesbyquantity:todaysalesbyquantity, 
      todaysalesbyshop:todaysalesbyshop,
      medicinelist:medicinelist,inventoryname:inventoryname,
      warelist:warelist,shoplist:shoplist,user:req.user})
  }
}else{
  const currentDate = new Date(startdate);
  const currentDate2 = new Date(enddate);
  const startOfDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
    3, // Set hours to 6:00 AM
    0,
    0,
    0
  );
  const startOfDay2 = new Date(
    currentDate2.getFullYear(),
    currentDate2.getMonth(),
    currentDate2.getDate(),
    3, // Set hours to 6:00 AM
    0,
    0,
    0
  );
  const endOfDay = new Date(startOfDay2);
  endOfDay.setDate(endOfDay.getDate() + 1);
  endOfDay.setSeconds(endOfDay.getSeconds() - 1);
  const [todaysalesbyshop,dm] =await db.sequelize.query(`
  select Shops.shopname,sum(SalesData.totalpayable) as quantity  from  SalesData
  
  inner join Shops on SalesData.shopid = Shops.shopid
  where  SalesData.createdAt between '${formatDateTime(startOfDay)}' and '${formatDateTime(endOfDay)}' group by Shops.shopname
  
  `);
  const [todaysalesbyquantity,dmq] =await db.sequelize.query(`
  select medicinename,sum(SalesData.quantity) as quantity  from  SalesData
  
  inner join MedicineInfos on MedicineInfos.medid = SalesData.medicineid
  where  SalesData.createdAt between '${formatDateTime(startOfDay)}' and '${formatDateTime(endOfDay)}' group by medicinename order by quantity  limit 5
  
  `)
  const [todaysalesbyvalue,dmv] =await db.sequelize.query(`
  select medicinename,sum(SalesData.totalpayable) as quantity  from  SalesData
  
  inner join MedicineInfos on MedicineInfos.medid = SalesData.medicineid
  where  SalesData.createdAt between '${formatDateTime(startOfDay)}' and '${formatDateTime(endOfDay)}' group by medicinename order by quantity  limit 5
  
  `);
 
  console.log(sqlQuery)
    // Execute the SQL query using your database connection
    // (Replace this with your actual database query code)
    const [results,rm]  = await db.sequelize.query(sqlQuery);
    if (!results) {
      console.log(error)
      res.render('adminreportSR',{salesdata:'',
        medicinecategory:medicinecategoryes,
        medicinegenericiname:medicinegenericiname,
        todaysalesbyvalue:todaysalesbyvalue,
        salesDataByDate: salesDataByDate,
        todaysalesbyquantity:todaysalesbyquantity, 
        todaysalesbyshop:todaysalesbyshop,
        medicinelist:medicinelist,inventoryname:inventoryname,
        warelist:warelist,shoplist:shoplist,user:req.user})
    } else {
      // Send the filtered inventory data to the client
      res.render('adminreportSR',{salesdata:results,
        medicinecategory:medicinecategoryes,
        medicinegenericiname:medicinegenericiname,
        todaysalesbyvalue:todaysalesbyvalue,
        salesDataByDate: salesDataByDate,
        todaysalesbyquantity:todaysalesbyquantity, 
        todaysalesbyshop:todaysalesbyshop,
        medicinelist:medicinelist,inventoryname:inventoryname,
        warelist:warelist,shoplist:shoplist,user:req.user})
    }
}

});

router.post('/searchstatistics',ensureAuthenticated,async function (req,res){
 const {reporttype,shopname,inventoryname} = req.body;


 if(reporttype ==="IS"){
  const [currentinventory,csm] = await db.sequelize.query(`
  select medicinename, sum(quantity) as quantity from Inventories 
  Inner Join MedicineInfos on medid = medicineid
  group by medicinename
  `)
  const [overstock,osm] = await db.sequelize.query(`
  select medicinename, sum(quantity) as quantity from Inventories 
  Inner Join MedicineInfos on medid = medicineid
  group by medicinename
  ORDER BY quantity DESC
  LIMIT 10;
  `)
  const [outofstock,oosm] = await db.sequelize.query(`
  select medicinename, sum(quantity) as quantity from Inventories 
  Inner Join MedicineInfos on medid = medicineid
  group by medicinename
  ORDER BY quantity ASC
  LIMIT 10;
  `)
  const [medicinebycategory,mbcm] = await db.sequelize.query(`
  select medicinecategoryname, sum(quantity) as quantity from Inventories 
  Inner Join MedicineInfos on medid = medicineid
  Inner Join MedicineCategories on MedicineInfos.medicinecategory = categoryid
  group by medicinecategoryname
  
  `)
  res.render('inventorystatistics',{currentinventory:currentinventory,
  overstock:overstock,
  outofstock:outofstock,
  medicinebycategory:medicinebycategory
  })
 }else if(reporttype ==="SS"){

 
 

  const top10salesbymedicinename =`
  SELECT  medicinename, COUNT(medicineid) AS total_count
FROM SalesData
INNER JOIN MedicineInfos mi ON medicineid = medid
GROUP BY  medicinename
ORDER BY total_count DESC
LIMIT 10;
  `

  const least10salesbymedicinename =`
  SELECT  medicinename, COUNT(medicineid) AS total_count
FROM SalesData
INNER JOIN MedicineInfos mi ON medicineid = medid
GROUP BY  medicinename
ORDER BY total_count ASC
LIMIT 10;
  `
   const salesbymonth = `
   SELECT
    DATE_FORMAT(createdAt, '%Y-%m') AS month,
    SUM(totalpayable) AS monthly_sales_revenue
FROM SalesData
GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
ORDER BY DATE_FORMAT(createdAt, '%Y-%m');
   `;
   const salesofshops =  `
   SELECT
    shopname,
    SUM(totalpayable) AS shop_sales_revenue
FROM SalesData
inner join Shops on Shops.shopid = SalesData.shopid
GROUP BY shopname

   `;
  const last30daysalestotaleachday = `SELECT DATE(createdAt) AS dayofsale, SUM(totalpayable) AS daily_sales_revenue
  FROM SalesData
  WHERE DATE(createdAt) >= CURDATE() - INTERVAL 30 DAY
  GROUP BY DATE(createdAt)
  ORDER BY DATE(createdAt);`;
  const salesbymedicinecategory = `
  SELECT mc.medicinecategoryname AS salecategory, SUM(sd.totalpayable) AS daily_sales_revenue
FROM SalesData sd
INNER JOIN MedicineInfos mi ON sd.medicineid = mi.medid
INNER JOIN MedicineCategories mc ON mi.medicinecategory = mc.categoryid

GROUP BY  mc.medicinecategoryname


  `
  const salesbymedicine = `
  SELECT mi.medicinename as medicinename, SUM(sd.totalpayable) AS daily_sales_revenue
FROM SalesData sd
INNER JOIN MedicineInfos mi ON sd.medicineid = mi.medid
GROUP BY  mi.medicinename
  `
  const monthlysalebycategory = `
  SELECT 
  DATE_FORMAT(SD.createdAt, '%b') AS months,
  MC.medicinecategoryname AS category,
  SUM(SD.totalpayable) AS monthly_sales_revenue
FROM SalesData SD
INNER JOIN MedicineInfos MI ON SD.medicineid = MI.medid
INNER JOIN MedicineCategories MC ON MI.medicinecategory = MC.categoryid
GROUP BY months, category
ORDER BY months, category
  `

  const [last30daytrend,m1] = await db.sequelize.query(last30daysalestotaleachday);
  const [salesbymedicinecat,m2] = await db.sequelize.query(salesbymedicinecategory);
  const [salesbymedicinename,m3] = await db.sequelize.query(salesbymedicine);
  const [salesbymonthdt,m4] = await db.sequelize.query(salesbymonth);
  const [monthlysalebycategorydt,m8] =await db.sequelize.query(monthlysalebycategory);
  const [salesofshopsdt,m5] = await db.sequelize.query(salesofshops);
  const [top10salesbymedicinenamedt,m6] = await db.sequelize.query(top10salesbymedicinename);
  const [least10salesbymedicinenamedt,m7] = await db.sequelize.query(least10salesbymedicinename);
  res.render('salesstatistics',{last30daytrend:last30daytrend,
    salesbymonth:salesbymonthdt,
    salesofshops:salesofshopsdt,
    monthlysalebycategory:monthlysalebycategorydt,
    top10salesbymedicinename:top10salesbymedicinenamedt,
    least10salesbymedicinename:least10salesbymedicinenamedt,
    salesbymedicinename:salesbymedicinename,
    salesbymedicinecategory:salesbymedicinecat})
 }
})
module.exports = router;