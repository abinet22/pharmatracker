const express = require('express');
const router = express.Router();

const bcrypt = require('bcryptjs');
const passport = require('passport');

const path = require('path');
const db = require("../models");
const Docxtemplater = require('docxtemplater');
const Op = db.Sequelize.Op;
const fs = require('fs');
const util = require('util');
const numberToWords = require('number-to-words');
const readFile = util.promisify(fs.readFile);
const PizZip = require('pizzip');
const readXlsxFile = require('read-excel-file/node');
var Json2csvParser = require('json2csv').Parser;
const { v4: uuidv4 } = require('uuid');
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');
const {toNumeralsAM,toCurrencyAM} = require('../middleware/numberToAm');
const { json } = require('express');
router.get('/addsales', ensureAuthenticated, async (req, res) => {
  const medicinecategorylist = await db.MedicineCategory.findAll({});
  const medicinegenericinamelist = await db.MedicineGenericName.findAll({});
  const supplierlist = await db.MedicineSupplier.findAll({});
  const warehouselist = await db.Warehouse.findAll({});
  const shoplist = await db.Shop.findAll({});
  const [medicinelist,mlm] = await db.sequelize.query(`
  select * from MedicineInfos 
  inner join MedicineCategories on categoryid = medicinecategory 
  inner join MedicineGenericNames on drugid = medicinegenericname 
  inner join MedicineManufucturers on manufuctureid = medicinemanufucturer
  inner join Inventories on medicineid = medid
  where quantity > 0 and warehouseid = '${req.user.shopwareid}'
  `);
  const inventory = await db.Inventory.findAll({
    where: {
      warehouseid: req.user.shopwareid,
      quantity: {
        [db.Sequelize.Op.gte]: 1, // gte stands for "greater than or equal to"1
      },
    },
  });
  
  const manufucturerlist = await db.MedicineManufucturer.findAll({});
  res.render('addsales',{medicinecategorylist:medicinecategorylist,
    medicinegenericinamelist:medicinegenericinamelist,
    supplierlist:supplierlist,
    manufucturerlist:manufucturerlist,
    shoplist:shoplist,
    user:req.user,
    inventory:inventory,
    warehouselist:warehouselist,
    medicinelist:medicinelist

  })
});

router.post('/addnewsales', ensureAuthenticated, async function (req, res) {
  const { rowmaterialamountobjarray,attachyesno ,totalamount,customertin,customername,customerphone} = req.body;
  const currentDate = new Date();
  const startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0);
  const endOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59);
  const medicinecategorylist = await db.MedicineCategory.findAll({});
  const medicinegenericinamelist = await db.MedicineGenericName.findAll({});
  const supplierlist = await db.MedicineSupplier.findAll({});
  const warehouselist = await db.Warehouse.findAll({});
  const inventory = await db.Inventory.findAll({where:{warehouseid:req.user.shopwareid}})
  const shoplist = await db.Shop.findAll({});
  const [medicinelist,mlm] = await db.sequelize.query(`
  select * from MedicineInfos 
  inner join MedicineCategories on categoryid = medicinecategory 
  inner join MedicineGenericNames on drugid = medicinegenericname 
  inner join MedicineManufucturers on manufuctureid = medicinemanufucturer
  inner join Inventories on medicineid = medid
  where quantity > 0 and warehouseid = '${req.user.shopwareid}'
  `)
  const manufucturerlist = await db.MedicineManufucturer.findAll({});
  // const todaysaledata = await db.SaleSummery.findAll({where: {
  //     createdAt: {
  //       [Op.between]: [startOfDay, endOfDay],
  //     },soldby: req.user.staffid,
  //   },});
 
 let errors =[]
  if (!rowmaterialamountobjarray  ||!totalamount  ) {
     errors.push({msg:'Please enter all required fields'})
  } 


  if(errors.length >0){
    res.render('addsales',{medicinecategorylist:medicinecategorylist,
      medicinegenericinamelist:medicinegenericinamelist,
      supplierlist:supplierlist,
      manufucturerlist:manufucturerlist,
      shoplist:shoplist,
      warehouselist:warehouselist,
      medicinelist:medicinelist,
       user:req.user,
      inventory:inventory,
    })
  }
  else {
    let transaction; // Define a transaction variable

try {
    // Start the transaction
    transaction = await db.sequelize.transaction();
    const saledata = JSON.parse(rowmaterialamountobjarray);
    const saleId = uuidv4();
    let allSaleDataCreated = true; // Flag to track if all saleData records are created
  
    // Iterate through the row material amount objects
    for (const item of saledata) {
        const existingProduct = await db.Inventory.findOne({
            where: {
                productcode: item.productCode,
                warehouseid: req.user.shopwareid,
                medicineid: item.medicineId,
                invid:item.invId
            },
            transaction: transaction,
        });

        // Update the row material amount in the database
        if (existingProduct) {
            // Calculate the new totamount by subtracting item.amount
            const newTotAmount = parseFloat(existingProduct.quantity) - parseFloat(item.quantity);

            // Update the row material totamount in the database
            if (newTotAmount >= 0) {
                // Update the row material totamount in the database
                await db.Inventory.update(
                    { quantity: newTotAmount },
                    {
                        where: {
                            warehouseid: req.user.shopwareid,
                            medicineid: item.medicineId,
                            productcode: item.productCode,
                            invid:item.invId
                        },
                        transaction: transaction,
                    }
                );

                const saleData = {
                    saleid: saleId,
                    customername: customername,
                    customerphone: customerphone,
                    customertin: customertin,
                    productcode: item.productCode,
                    medicineid: item.medicineId,
                    unitprice: item.sellPrice,
                    transactiontype: 'Cash',
                    discountamount: 0,
                    totalpayable: item.totalamount,
                    paid: item.totalamount,
                    shopid: req.user.shopwareid,
                    quantity: item.quantity,
                    soldby: req.user.staffid,
                };

                const createdSaleData = await db.SalesData.create(saleData, { transaction, transaction });

                if (!createdSaleData) {
                    allSaleDataCreated = false; // Set the flag to false if any saleData is not created
                }
            } else {
                // Handle the case where newTotAmount is less than 0
                allSaleDataCreated = false; // Set the flag to false
                errors.push({msg:'Error Low Inventory Quantity'})
                // res.render('addsales', {
                //     medicinecategorylist: medicinecategorylist,
                //     medicinegenericinamelist: medicinegenericinamelist,
                //     supplierlist: supplierlist,
                //     manufucturerlist: manufucturerlist,
                //     shoplist: shoplist,
                //     inventory:inventory,
                //     user:req.user,
                //     warehouselist: warehouselist,
                //     medicinelist: medicinelist,
                //     error_msg: 'Error Low Inventory',
                // });
            }
        } else {
            // Handle the case where existingProduct is not found
            allSaleDataCreated = false; // Set the flag to false
            errors.push({msg:'Error Drug not found'})
            // res.render('addsales', {
            //     medicinecategorylist: medicinecategorylist,
            //     medicinegenericinamelist: medicinegenericinamelist,
            //     supplierlist: supplierlist,
            //     manufucturerlist: manufucturerlist,
            //     shoplist: shoplist,
            //     user:req.user,
            //     inventory:inventory,
            //     warehouselist: warehouselist,
            //     medicinelist: medicinelist,
            //     error_msg: 'Error Drug not found',
            // });
        }
    }

    if (allSaleDataCreated) {
        const saleSummery = {
            saleid: saleId,
            soldby: req.user.staffid,
            productinfo: JSON.parse(rowmaterialamountobjarray),
            totalamount: parseFloat(totalamount),
            paidamount: parseFloat(totalamount),
            creditamount: 0,
            shopid: req.user.shopwareid,
            customername: customerphone,
            customerphone: customerphone,
        };

        const bpl = await db.SaleSummery.create(saleSummery, { transaction: transaction });

        if (bpl) {
         // const { rowmaterialamountobjarray, totalamount, customertin, customername, customerphone } = req.body;
          if(attachyesno === "Yes"){
            res.redirect(`/sales/sales-success?saleId=${saleId}&rowmaterialamountobjarray=${rowmaterialamountobjarray}&totalamount=${totalamount}&customertin=${customertin}&customername=${customername}&customerphone=${customerphone}`);

          }else{
            res.redirect('/sales/sales-success');
          }
// Redirect to the sales-success route with query parameters

          //  res.redirect('/sales/sales-success');
            // res.render('addsales', {
            //     medicinecategorylist: medicinecategorylist,
            //     medicinegenericinamelist: medicinegenericinamelist,
            //     supplierlist: supplierlist,
            //     manufucturerlist: manufucturerlist,
            //     shoplist: shoplist,
            //     inventory:inventory,
            //     user:req.user,
            //     warehouselist: warehouselist,
            //     medicinelist: medicinelist,
            //     success_msg: 'Successfully create sales data',
            // });
        } else {
            res.render('addsales', {
                medicinecategorylist: medicinecategorylist,
                medicinegenericinamelist: medicinegenericinamelist,
                supplierlist: supplierlist,
                manufucturerlist: manufucturerlist,
                shoplist: shoplist,
                inventory:inventory,
                user:req.user,
                warehouselist: warehouselist,
                medicinelist: medicinelist,
                errors,
                error_msg: 'Error while creating sales try again',
            });
        }
    } else {
        // Handle the case where not all saleData records are created
        res.render('addsales', {
            medicinecategorylist: medicinecategorylist,
            medicinegenericinamelist: medicinegenericinamelist,
            supplierlist: supplierlist,
            manufucturerlist: manufucturerlist,
            shoplist: shoplist,
            user:req.user,
            inventory:inventory,
            warehouselist: warehouselist,
            medicinelist: medicinelist,
            errors,
            error_msg: 'Error while creating sales data. Please try again.',
        });
    }

    // Commit the transaction
    await transaction.commit();
} catch (error) {
    console.log(error);
    // Handle any errors that occurred during the transaction
    if (transaction) {
        await transaction.rollback(); // Rollback the transaction if an error occurs
    }

    res.render('addsales', {
        medicinecategorylist: medicinecategorylist,
        medicinegenericinamelist: medicinegenericinamelist,
        supplierlist: supplierlist,
        manufucturerlist: manufucturerlist,
        shoplist: shoplist,
        inventory:inventory,
        user:req.user,
        warehouselist: warehouselist,
        medicinelist: medicinelist,
        errors,
        error_msg: 'Error while creating sales try again',
    });
}

  }
});
router.get('/sales-success', ensureAuthenticated, async function (req, res) {
  const medicinecategorylist = await db.MedicineCategory.findAll({});
  const medicinegenericinamelist = await db.MedicineGenericName.findAll({});
  const supplierlist = await db.MedicineSupplier.findAll({});
  const warehouselist = await db.Warehouse.findAll({});
  const shoplist = await db.Shop.findAll({});
  const [medicinelist, mlm] = await db.sequelize.query(`
          SELECT * FROM MedicineInfos 
          INNER JOIN MedicineCategories ON categoryid = medicinecategory 
          INNER JOIN MedicineGenericNames ON drugid = medicinegenericname 
          INNER JOIN MedicineManufucturers ON manufuctureid = medicinemanufucturer
          INNER JOIN Inventories ON medicineid = medid
          WHERE quantity > 0 AND warehouseid = '${req.user.shopwareid}'
      `);
      const inventory = await db.Inventory.findAll({
          where: {
              warehouseid: req.user.shopwareid,
              quantity: { [Op.gte]: 1 }, // greater than or equal to 1
          },
      });
      const manufucturerlist = await db.MedicineManufucturer.findAll({});
      const { rowmaterialamountobjarray, totalamount, saleId, customertin, customername } = req.query;
      if (!rowmaterialamountobjarray  ||!totalamount ||!saleId || !customertin|| ! customername ) {
        res.render('addsales', {
          medicinecategorylist: medicinecategorylist,
          medicinegenericinamelist: medicinegenericinamelist,
          supplierlist: supplierlist,
          manufucturerlist: manufucturerlist,
          shoplist: shoplist,
          inventory: inventory,
          user: req.user,
          warehouselist: warehouselist,
          medicinelist: medicinelist,
          success_msg: 'Successfully create sales data',
      });
     } else{
      try {
    
        // Fetch necessary data from the database
      
        const username = await db.User.findOne({ where: { staffid: req.user.staffid } });
        
        // Load the Word document template
        const templatePath = path.join(__dirname, '../public/template/PharmacyInvoice.docx');
        const content = await readFile(templatePath);
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { nullGetter() { return ''; } });
  
        // Fetch sales data from the database
        const sales = await db.SalesData.findOne({ where: { saleid: saleId } });
        const [salesdt,salesmt] = await db.sequelize.query(`
        select medicinename,batchno,SalesData.unitprice,SalesData.totalpayable,SalesData.quantity,packagetype from SalesData
         inner join MedicineInfos on SalesData.medicineid = MedicineInfos.medid
         inner join Inventories on Inventories.medicineid = MedicineInfos.medid
        where  saleid ='${saleId}' and warehouseid = '${req.user.shopwareid}'
        `)
        const salesdata = salesdt.map((row, index) => ({
          
            id: index + 1,
            unitprice: row.unitprice,
            quantity: row.quantity,
            batchno:row.batchno,
            totalpayable: (parseFloat(row.totalpayable).toLocaleString('am-ET', { style: 'currency', currency: 'ETB' })).replace('ብር', '').trim(),
           
            medicinename: row.medicinename,
            measure: row.packagetype,
        }));
        const totalamount2 = parseFloat(totalamount);
        const tot3 = totalamount2.toFixed(2);
          const tot =  parseFloat(tot3) * 0.02;
          const generaltotal =  parseFloat(tot) +  parseFloat(totalamount) ;
          const roundedTot = parseFloat(tot.toFixed(2));
          
          const roundedGeneraltotal = parseFloat(generaltotal.toFixed(2));

        // Set data for rendering in the Word document
        //const amountinwordsen = numberToWords.toWords(generaltotal);
        const currencySymbol = 'birr';
        const amountinwordsen =  toCurrencyWords(roundedGeneraltotal, currencySymbol, 'en');
        const amountinwordsamharic = toCurrencyAM(parseFloat(roundedGeneraltotal));
        const numtot = (roundedTot.toLocaleString('am-ET', { style: 'currency', currency: 'ETB' })).replace('ብር', '').trim();
        const numgentot = roundedGeneraltotal.toLocaleString('am-ET', { style: 'currency', currency: 'ETB' }).replace('ብር', '').trim();;
        console.log(amountinwordsen)
        console.log(amountinwordsamharic)
        doc.setData({
            customername: customername,
            customertin: customertin,
            username: username.fullname,
            totalamount: (parseFloat(tot3).toLocaleString('am-ET', { style: 'currency', currency: 'ETB' })).replace('ብር', '').trim(),
            salesdata: salesdata,
            tot:numtot,
            salesdate: new Date(sales.createdAt).toLocaleDateString(),
            generaltotal:numgentot,
            amountinwordsamharic:amountinwordsamharic,
            amountinwordsen:amountinwordsen

        });
  
        // Render the Word document
        doc.render();
  
        // Generate and send the Word document as a response
        const buffer = doc.getZip().generate({ type: 'nodebuffer' });
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': 'inline; filename="Attachement.docx"',
            'Content-Length': buffer.length,
        });
        res.send(buffer);
      
        res.end();
        
       
    } catch (error) {
        console.error(error);
       
        res.render('addsales', {
          medicinecategorylist: medicinecategorylist,
          medicinegenericinamelist: medicinegenericinamelist,
          supplierlist: supplierlist,
          manufucturerlist: manufucturerlist,
          shoplist: shoplist,
          inventory: inventory,
          user: req.user,
          warehouselist: warehouselist,
          medicinelist: medicinelist,
          success_msg: 'Successfully create sales data',
          error_msg:'Error generating attachement document'
      });
    }
     }
   

 
});
router.get('/todaysalesdata',ensureAuthenticated,async (req,res) =>{
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

    
    // Example usage
  
    const formattedDatestart = formatDateTime(startOfDay);
    const formattedDateend = formatDateTime(endOfDay);
    
    const [salelist, sdlm] = await db.sequelize.query(`
    SELECT SalesData.*,MedicineInfos.medicinename
    FROM SalesData
    INNER JOIN MedicineInfos ON SalesData.medicineid = MedicineInfos.medid
    WHERE SalesData.createdAt BETWEEN '${formattedDatestart}' AND '${formattedDateend}'
    AND SalesData.soldby = '${req.user.staffid}' order by createdAt desc
    `);
    const [todaysalesbyshop,dm] =await db.sequelize.query(`
    select Shops.shopname,sum(SalesData.totalpayable) as quantity  from  SalesData
    
    inner join Shops on SalesData.shopid = Shops.shopid
    where  SalesData.createdAt between '${formattedDatestart}' and '${formattedDateend}' AND 
    SalesData.soldby = '${req.user.staffid}' group by Shops.shopname
  
    `);
    const [todaysalesbyquantity,dmq] =await db.sequelize.query(`
    select medicinename,sum(SalesData.quantity) as quantity  from  SalesData
    
    inner join MedicineInfos on MedicineInfos.medid = SalesData.medicineid
    where  SalesData.createdAt between '${formattedDatestart}' and '${formattedDateend}' 
    AND SalesData.soldby = '${req.user.staffid}' group by medicinename order by quantity desc limit 5
  
    `)
    const [todaysalesbyvalue,dmv] =await db.sequelize.query(`
    select medicinename,sum(SalesData.totalpayable) as quantity  from  SalesData
    
    inner join MedicineInfos on MedicineInfos.medid = SalesData.medicineid
    where  SalesData.createdAt between '${formattedDatestart}' and '${formattedDateend}' 
    AND SalesData.soldby = '${req.user.staffid}' group by medicinename order by quantity desc limit 5
  
    `);

   res.render('todaysalestransaction',{ 
    todaysalesbyvalue:todaysalesbyvalue,
    todaysalesbyquantity:todaysalesbyquantity,
    todaysalesbyshop:todaysalesbyshop,
    user:req.user,salelist:salelist})
})
router.get('/allsaleslist',ensureAuthenticated,async (req,res) =>{
    
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
  const [inventory,mlm] = await db.sequelize.query(`
  select * from  Inventories
  inner join MedicineInfos on MedicineInfos.medid = Inventories.medicineid
  inner join MedicineCategories on categoryid = MedicineInfos.medicinecategory 
  inner join MedicineGenericNames on drugid = MedicineInfos.medicinegenericname 
  inner join MedicineManufucturers on manufuctureid = MedicineInfos.medicinemanufucturer
  where warehouseid = '${req.user.shopwareid}'
  `);

const shopname = await db.Shop.findOne({where:{shopid: req.user.shopwareid}})



const [salelist, sdlm] = await db.sequelize.query(`
SELECT  SalesData.*,medicinename,fullname,shopname
FROM SalesData
inner join Users on staffid = soldby
inner join Shops on SalesData.shopid= Shops.shopid
INNER JOIN MedicineInfos ON SalesData.medicineid = MedicineInfos.medid
where SalesData.soldby = '${req.user.staffid}' order by createdAt desc
`);
const [todaysalesbyshop,dm] =await db.sequelize.query(`
select Shops.shopname,sum(SalesData.totalpayable) as quantity  from  SalesData

inner join Shops on SalesData.shopid = Shops.shopid
where SalesData.soldby = '${req.user.staffid}'
 group by Shops.shopname

`);
const [todaysalesbyquantity,dmq] =await db.sequelize.query(`
select medicinename,sum(SalesData.quantity) as quantity  from  SalesData

inner join MedicineInfos on MedicineInfos.medid = SalesData.medicineid
where SalesData.soldby = '${req.user.staffid}'
 group by medicinename order by quantity  desc limit 5

`)
const [todaysalesbyvalue,dmv] =await db.sequelize.query(`
select medicinename,sum(SalesData.totalpayable) as quantity  from  SalesData

inner join MedicineInfos on MedicineInfos.medid = SalesData.medicineid
where SalesData.soldby = '${req.user.staffid}'
 group by medicinename order by quantity desc  limit 5

`);
   res.render('allsalestransaction',{
    todaysalesbyvalue:todaysalesbyvalue,
    todaysalesbyquantity:todaysalesbyquantity,
    todaysalesbyshop:todaysalesbyshop,
    salesDataByDate:salesDataByDate,
    salelist:salelist,shopname:shopname,user:req.user,inventory:inventory})
})

router.post('/searchfiltersalesdata',ensureAuthenticated,async (req,res) =>{
    
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
    const [inventory,mlm] = await db.sequelize.query(`
    select * from  Inventories
  inner join MedicineInfos on MedicineInfos.medid = Inventories.medicineid
  inner join MedicineCategories on categoryid = MedicineInfos.medicinecategory 
  inner join MedicineGenericNames on drugid = MedicineInfos.medicinegenericname 
  inner join MedicineManufucturers on manufuctureid = MedicineInfos.medicinemanufucturer
    where warehouseid = '${req.user.shopwareid}' 
    `);
    const {enddate,startdate,shopnames} =req.body;
 
const shopname = await db.Shop.findOne({where:{shopid: req.user.shopwareid}})

if(!enddate || !startdate || !shopnames || shopnames ==="0"){
  const [salelist, sdlm] = await db.sequelize.query(`
  SELECT  SalesData.*,medicinename,fullname,shopname
FROM SalesData
inner join Users on staffid = soldby
inner join Shops on SalesData.shopid= Shops.shopid
INNER JOIN MedicineInfos ON SalesData.medicineid = MedicineInfos.medid
where SalesData.soldby = '${req.user.staffid}' order by createdAt desc
`);
const [todaysalesbyshop,dm] =await db.sequelize.query(`
select Shops.shopname,sum(SalesData.totalpayable) as quantity  from  SalesData

inner join Shops on SalesData.shopid = Shops.shopid
where SalesData.soldby = '${req.user.staffid}'
 group by Shops.shopname

`);
const [todaysalesbyquantity,dmq] =await db.sequelize.query(`
select medicinename,sum(SalesData.quantity) as quantity  from  SalesData

inner join MedicineInfos on MedicineInfos.medid = SalesData.medicineid
where SalesData.soldby = '${req.user.staffid}'
 group by medicinename order by quantity desc limit 5

`)
const [todaysalesbyvalue,dmv] =await db.sequelize.query(`
select medicinename,sum(SalesData.totalpayable) as quantity  from  SalesData

inner join MedicineInfos on MedicineInfos.medid = SalesData.medicineid
where SalesData.soldby = '${req.user.staffid}'
 group by medicinename order by quantity desc limit 5

`);
  res.render('allsalestransaction',{
    todaysalesbyvalue:todaysalesbyvalue,
    error_msg:"Please select all required fields",
    todaysalesbyquantity:todaysalesbyquantity,
    salesDataByDate: salesDataByDate,
    todaysalesbyshop:todaysalesbyshop,
    salelist:salelist,shopname:shopname,user:req.user,inventory:inventory})
}
else{
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
  const [salelist, sdlm] = await db.sequelize.query(`
  SELECT  SalesData.*,medicinename,fullname,shopname
FROM SalesData
inner join Users on staffid = soldby
inner join Shops on SalesData.shopid= Shops.shopid
INNER JOIN MedicineInfos ON SalesData.medicineid = MedicineInfos.medid
WHERE SalesData.createdAt BETWEEN '${formatDateTime(startOfDay)}' AND '${formatDateTime(endOfDay)}' and SalesData.shopid ='${shopnames}'
and SalesData.soldby = '${req.user.staffid}' order by createdAt desc
`);
const [todaysalesbyshop,dm] =await db.sequelize.query(`
select Shops.shopname,sum(SalesData.totalpayable) as quantity  from  SalesData

inner join Shops on SalesData.shopid = Shops.shopid
where  SalesData.createdAt between '${formatDateTime(startOfDay)}' and '${formatDateTime(endOfDay)}' and SalesData.soldby = '${req.user.staffid}' group by Shops.shopname

`);
const [todaysalesbyquantity,dmq] =await db.sequelize.query(`
select medicinename,sum(SalesData.quantity) as quantity  from  SalesData

inner join MedicineInfos on MedicineInfos.medid = SalesData.medicineid
where  SalesData.createdAt between '${formatDateTime(startOfDay)}' and '${formatDateTime(endOfDay)}' and SalesData.soldby = '${req.user.staffid}'
 group by medicinename order by quantity desc  limit 5

`)
const [todaysalesbyvalue,dmv] =await db.sequelize.query(`
select medicinename,sum(SalesData.totalpayable) as quantity  from  SalesData

inner join MedicineInfos on MedicineInfos.medid = SalesData.medicineid
where  SalesData.createdAt between '${formatDateTime(startOfDay)}' and '${formatDateTime(endOfDay)}' and SalesData.soldby = '${req.user.staffid}'
 group by medicinename order by quantity desc limit 5

`);
  res.render('allsalestransaction',{
    todaysalesbyvalue:todaysalesbyvalue,
    todaysalesbyquantity:todaysalesbyquantity,
    todaysalesbyshop:todaysalesbyshop,
    salesDataByDate: salesDataByDate,
    salelist:salelist,shopname:shopname,user:req.user,inventory:inventory})
}
  
  
})

router.get('/inventorylist',ensureAuthenticated,async (req,res) =>{

  const [inventorytot,m2lm] = await db.sequelize.query(`
  SELECT 
  medicinename,medicinecategoryname,genericname,medid as medicineid,warehouseid,
  COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name,sum(quantity) as totalamount
FROM Inventories
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid

LEFT JOIN Shops ON Shops.shopid = Inventories.warehouseid
LEFT JOIN Warehouses ON Warehouses.invid = Inventories.warehouseid
where warehouseid = '${req.user.shopwareid}' and MedicineInfos.suppliertype='Type_I'
group by medicinename,medicinecategoryname,genericname,location_name,medicineid,warehouseid

  `);

  const [inventory,mlm] = await db.sequelize.query(`
SELECT Inventories.invid,warehouseid,
manufuctureddate,expirydate,productcode,batchno,quantity,medicineid,suppliertype,medicinename,medicinecategoryname,genericname,
COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM Inventories
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid

LEFT JOIN Shops ON Shops.shopid = Inventories.warehouseid
LEFT JOIN Warehouses ON Warehouses.invid = Inventories.warehouseid
where warehouseid = '${req.user.shopwareid}' and MedicineInfos.suppliertype='Type_I'
`);
    const itemsPerPage = 20; // Number of items per page
    const currentPage = req.query.page ? parseInt(req.query.page) : 0;
    
    // Calculate the slice of joblist to display for the current page
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const inventorytotcurrent = inventorytot.slice(startIndex, endIndex);
  res.render('currentinventorylist',{inventory:inventory,
    inventorytot:inventorytotcurrent,
    currentPage: currentPage,
    totalPages: Math.ceil(inventorytot.length / itemsPerPage),
    user:req.user,})
});
router.get('/otherproductinventorylist',ensureAuthenticated,async (req,res) =>{
  const warelist = await db.Warehouse.findAll({});
  const shoplist = await db.Shop.findAll({});
  const [inventorytot,m2lm] = await db.sequelize.query(`
  SELECT 
  medicinename,medicinecategoryname,genericname,medid as medicineid,warehouseid,
  COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name,sum(quantity) as totalamount
FROM Inventories
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid
LEFT JOIN Shops ON Shops.shopid = Inventories.warehouseid
LEFT JOIN Warehouses ON Warehouses.invid = Inventories.warehouseid
where MedicineInfos.producttag='Other' and warehouseid = '${req.user.shopwareid}' 
group by medicinename,medicinecategoryname,genericname,location_name,medicineid,warehouseid
  `);
const [inventory,mlm] = await db.sequelize.query(`
SELECT Inventories.invid,warehouseid,
manufuctureddate,expirydate,productcode,quantity,medicineid,medicinename,medicinecategoryname,genericname,
COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM Inventories
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid
LEFT JOIN Shops ON Shops.shopid = Inventories.warehouseid
LEFT JOIN Warehouses ON Warehouses.invid = Inventories.warehouseid
where MedicineInfos.producttag='Other' and warehouseid = '${req.user.shopwareid}' 
`);
const itemsPerPage = 20; // Number of items per page
const currentPage = req.query.page ? parseInt(req.query.page) : 0;

// Calculate the slice of joblist to display for the current page
const startIndex = currentPage * itemsPerPage;
const endIndex = startIndex + itemsPerPage;
const inventorytotcurrent = inventorytot.slice(startIndex, endIndex);
res.render('othersalesproductinventorylist',{shoplist:shoplist,inventory:inventory,warelist:warelist,
inventorytot:inventorytot,
currentPage: currentPage,
totalPages: Math.ceil(inventorytot.length / itemsPerPage),
user:req.user,})
});
router.get('/inventorylog',ensureAuthenticated,async (req,res) =>{
  const [inventory,mlm] = await db.sequelize.query(`
  select 
  InventoryLogs.*,medicinename,medicinecategoryname,genericname,suppliertype
  FROM InventoryLogs
  inner join MedicineInfos on MedicineInfos.medid = InventoryLogs.medicineid
  inner join MedicineCategories on categoryid = MedicineInfos.medicinecategory 
  inner join MedicineGenericNames on drugid = MedicineInfos.medicinegenericname 
 
  inner join MedicineManufucturers on manufuctureid = MedicineInfos.medicinemanufucturer
  where warehouseid = '${req.user.shopwareid}' and  MedicineInfos.suppliertype='Type_I'
  `);
  res.render('inventorytransaction',{inventory:inventory, user:req.user,})
}) 
router.get('/inventorylogotherproduct',ensureAuthenticated,async (req,res) =>{
  const warelist = await db.Warehouse.findAll({});
  const shoplist = await db.Shop.findAll({});
  
  const [inventory,mlm] = await db.sequelize.query(`

  SELECT 
  InventoryLogs.*,medicinename,medicinecategoryname,genericname
FROM InventoryLogs
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid

where MedicineInfos.producttag='Other'  and warehouseid = '${req.user.shopwareid}'  
  `);
res.render('inventorylogotherproduct',{shoplist:shoplist,inventory:inventory,warelist:warelist, user:req.user,})
}) 
function toCurrencyWords(num, currency, lang = 'en') {
  try {
    const numString = num.toString();
    const dotPos = numString.indexOf('.');

    if (dotPos > 0) {
      const wholePart = +numString.slice(0, dotPos);
      const decimalPart = +numString.slice(dotPos + 1);
      const wholeWords = numberToWords.toWords(wholePart, { lang });
      const decimalWords = numberToWords.toWords(decimalPart, { lang });
      const currencyText = currency || '';
      const separator = lang === 'en' ? 'and' : 'እና';

      if (decimalPart === 0) {
        return `${wholeWords} ${currencyText}`;
      } else {
        return `${wholeWords} ${currencyText} ${separator} ${decimalWords} cents`;
      }
    } else {
      return numberToWords.toWords(num, { lang }) + ' ' + (currency || '');
    }
  } catch (error) {
    return error.message;
  }
}

module.exports = router;