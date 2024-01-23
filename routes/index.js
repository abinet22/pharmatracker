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
router.get('/', forwardAuthenticated, (req, res) => res.render('login'));
router.get('/offlinesales', forwardAuthenticated,async (req, res) =>
{
  res.render('offlinesales',{user:'',medicinelist:'',inventory:''})
}
 );

router.get('/login', forwardAuthenticated, (req, res) => res.render('login'));
router.get('/forgetpassword', forwardAuthenticated, (req, res) => res.render('forgetpassword',{user:req.user}));
router.post('/forgetpassword', forwardAuthenticated, (req, res) => res.render('login',{user:req.user}));
router.get('/dashboard', ensureAuthenticated, async function (req, res) {

  const formattedDates = [];
  const salesDataByDate = [];
  const salesDataByShop = [];
  function getDayOfWeek(date, timeZone = 'Africa/Nairobi') {
    const options = { weekday: 'long' }; // or 'short' for abbreviated names
  
    return date.toLocaleDateString('en-US', { timeZone, ...options });
  }
  const currentDate = new Date();
  const startOfDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
    3, // Set hours to 6:00 AM
    0,
    0,
    0
  );

  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  endOfDay.setSeconds(endOfDay.getSeconds() - 1);
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
  const formattedDatestart = formatDateTime(startOfDay);
  const formattedDateend = formatDateTime(endOfDay);

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

  // Calculate start and end dates for the last seven days
  const [todaysalesbyquantity,dmq] =await db.sequelize.query(`
  select medicinename,sum(SalesData.quantity) as quantity  from  SalesData
  
  inner join MedicineInfos on MedicineInfos.medid = SalesData.medicineid
  where  SalesData.createdAt between '${formattedDatestart}' and '${formattedDateend}' group by medicinename order by quantity  desc limit 5

  `)
  const [todaysalesbyvalue,dmv] =await db.sequelize.query(`
  select medicinename,sum(SalesData.totalpayable) as quantity  from  SalesData
  
  inner join MedicineInfos on MedicineInfos.medid = SalesData.medicineid
  where  SalesData.createdAt between '${formattedDatestart}' and '${formattedDateend}' group by medicinename order by quantity desc limit 5

  `);
  const [alltimesalesbyquantity,amq] =await db.sequelize.query(`
  select medicinename,sum(SalesData.quantity) as quantity  from  SalesData
  
  inner join MedicineInfos on MedicineInfos.medid = SalesData.medicineid
   group by medicinename order by quantity desc limit 5
  
  `)
  const [alltimesalesbyvalue,amv] =await db.sequelize.query(`
  select medicinename,sum(SalesData.totalpayable) as quantity  from  SalesData
  
  inner join MedicineInfos on MedicineInfos.medid = SalesData.medicineid
   group by medicinename order by quantity desc limit 5
  
  `);
  const [inventnotification, inventnot] = await db.sequelize.query(`
    SELECT 
      medicinename,medicinecategoryname,genericname,medid as medicineid,warehouseid,
      COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name,
      sum(quantity) as quantity
    FROM Inventories
    INNER JOIN MedicineInfos ON medid = medicineid
    INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
    INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid
    LEFT JOIN Shops ON Shops.shopid = Inventories.warehouseid
    LEFT JOIN Warehouses ON Warehouses.invid = Inventories.warehouseid
    WHERE quantity <= 5
    GROUP BY medicinename,medicinecategoryname,genericname,location_name,medicineid,warehouseid
  `);
 const [expriypro,exmeta] = await db.sequelize.query(`
 SELECT 
 medicinename,
 medicinecategoryname,
 genericname,
 COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name,
 quantity,
 DATEDIFF(expirydate, CURDATE()) AS days_until_expiration
FROM Inventories
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid
LEFT JOIN Shops ON Shops.shopid = Inventories.warehouseid
LEFT JOIN Warehouses ON Warehouses.invid = Inventories.warehouseid
WHERE expirydate BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 4 MONTH) and quantity> 0
order by days_until_expiration asc
 `)

  const [inventnotificationshop, inventnots] = await db.sequelize.query(`
    SELECT 
      medicinename,medicinecategoryname,genericname,medid as medicineid,warehouseid,
      COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name,
      sum(quantity) as quantity
    FROM Inventories
    INNER JOIN MedicineInfos ON medid = medicineid
    INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
    INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid
    LEFT JOIN Shops ON Shops.shopid = Inventories.warehouseid
    LEFT JOIN Warehouses ON Warehouses.invid = Inventories.warehouseid
    WHERE warehouseid = '${req.user.shopwareid}' AND MedicineInfos.suppliertype='Type_I' AND quantity <= 5
    GROUP BY medicinename,medicinecategoryname,genericname,location_name,medicineid,warehouseid
  `);

  res.render('dashboard', {
    inventnotificationshop: inventnotificationshop,
    user: req.user,
    todaysalesbyshop:salesDataByDate,
    todaysalesbyquantity:todaysalesbyquantity,
    inventnotification: inventnotification,
    todaysalesbyvalue:todaysalesbyvalue,
    todaysalesbydrug:'',
    alltimesalesbyvalue:alltimesalesbyvalue,
    alltimesalesbyquantity:alltimesalesbyquantity,
    salesDataByDate: salesDataByDate,
    expriypro:expriypro
  });
});
// router.get('/dashboard', ensureAuthenticated, async function(req, res) {
//   const currentDate = new Date();
//   currentDate.setHours(6, 0, 0, 0); // Set to "00:00:00" (midnight)
  
//   // Calculate the end date by adding 24 hours to the start date
//   const endDate = new Date(currentDate);
//   endDate.setHours(17, 59, 59, 999);
//     function formatDateTime(date) {
//       const formattedDate = date.toISOString().slice(0, 19).replace('T', ' ');
//       return formattedDate;
//     }
//     function calculateEthiopianDay(date) {
//       // Adjust the input date to the Ethiopian timezone (EAT)
//       const ethiopianDate = new Date(date.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
    
//       // Set the time to the beginning of the day (6:00 AM)
//       ethiopianDate.setHours(6, 0, 0, 0);
    
//       // Calculate the end of the day by adding 24 hours
//       const ethiopianEndOfDay = new Date(ethiopianDate);
//       ethiopianEndOfDay.setHours(ethiopianEndOfDay.getHours() + 24);
    
//       return {
//         start: ethiopianDate,
//         end: ethiopianEndOfDay,
//       };
//     }
    
//     // Example usage
//     const today = new Date(); // Assuming today is 12/17/2023
//     const ethiopianDay = calculateEthiopianDay(today);
    
//     console.log('Ethiopian Start Date:', ethiopianDay.start);
//     console.log('Ethiopian End Date:', ethiopianDay.end);
//     const formattedDatestart = formatDateTime(ethiopianDay.start);
//     const formattedDateend = formatDateTime(ethiopianDay.end);
//     console.log('Ethiopian Start Date:', formattedDatestart);
//     console.log('Ethiopian End Date:', formattedDateend);
//   const [inventnotification,inventnot] =  await db.sequelize.query(`
  
//   SELECT 
//   medicinename,medicinecategoryname,genericname,medid as medicineid,warehouseid,
//   COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name,sum(quantity) as quantity
// FROM Inventories
// INNER JOIN MedicineInfos ON medid = medicineid
// INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
// INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid

// LEFT JOIN Shops ON Shops.shopid = Inventories.warehouseid
// LEFT JOIN Warehouses ON Warehouses.invid = Inventories.warehouseid
// where  quantity <=5
// group by medicinename,medicinecategoryname,genericname,location_name,medicineid,warehouseid
//   `);
//   const [inventnotificationshop,inventnots] =  await db.sequelize.query(`
  
//   SELECT 
//   medicinename,medicinecategoryname,genericname,medid as medicineid,warehouseid,
//   COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name,sum(quantity) as quantity
// FROM Inventories
// INNER JOIN MedicineInfos ON medid = medicineid
// INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
// INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid

// LEFT JOIN Shops ON Shops.shopid = Inventories.warehouseid
// LEFT JOIN Warehouses ON Warehouses.invid = Inventories.warehouseid
// where warehouseid = '${req.user.shopwareid}' and MedicineInfos.suppliertype='Type_I' and quantity <=5
// group by medicinename,medicinecategoryname,genericname,location_name,medicineid,warehouseid
//     `);
//   const [todaysalesbydrug,sm]  = await db.sequelize.query(`
//   select MedicineInfos.medicinename,sum(SalesData.totalpayable) as quantity  from  SalesData

//   inner join MedicineInfos on MedicineInfos.medid = SalesData.medicineid

//   where  SalesData.createdAt between '${formattedDatestart}' and '${formattedDateend}' group by MedicineInfos.medicinename
//   `);
//   console.log(todaysalesbydrug)
//   const [todaysalesbyshop,dm] =await db.sequelize.query(`
//   select Shops.shopname,sum(SalesData.totalpayable) as quantity  from  SalesData
  
//   inner join Shops on SalesData.shopid = Shops.shopid
//   where  SalesData.createdAt between '${formattedDatestart}' and '${formattedDateend}' group by Shops.shopname

//   `)
//   res.render('dashboard',{inventnotificationshop:inventnotificationshop,user:req.user,
// inventnotification:inventnotification,
// todaysalesbyshop:todaysalesbyshop,
// todaysalesbydrug:todaysalesbydrug})
// });

router.post('/addforgetpassword', forwardAuthenticated, async function(req, res) {res.render('forgetpassword',{user:req.user})});


router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true
  })(req, res, next);
});



router.get('/logout', (req, res) => {
  req.logout();
  req.flash('success_msg', 'You are logged out');
  res.redirect('/login');
});

module.exports = router;