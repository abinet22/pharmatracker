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
router.get('/addnewproduct', ensureAuthenticated, async (req, res) => {
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
  where MedicineInfos.producttag !='Other'
  `)
  const manufucturerlist = await db.MedicineManufucturer.findAll({});
  res.render('invaddnewproduct',{medicinecategorylist:medicinecategorylist,
    medicinegenericinamelist:medicinegenericinamelist,
    supplierlist:supplierlist,
    user:req.user,
    manufucturerlist:manufucturerlist,
    shoplist:shoplist,
    warehouselist:warehouselist,
    medicinelist:medicinelist

  })
});
router.post('/addnewproducttoinventory', ensureAuthenticated, async (req, res) => {
  const {rowmaterialamountobjarray} =req.body;
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
  where MedicineInfos.producttag !='Other'
  `)
  const manufucturerlist = await db.MedicineManufucturer.findAll({});
let errors =[];
  if (!rowmaterialamountobjarray ) {
    errors.push({msg:'Please enter all required fields'})
 } 


 if(errors.length >0){
   
  res.render('invaddnewproduct',{medicinecategorylist:medicinecategorylist,
    medicinegenericinamelist:medicinegenericinamelist,
    supplierlist:supplierlist,
    manufucturerlist:manufucturerlist,
    shoplist:shoplist,
    user:req.user,
    warehouselist:warehouselist,
    medicinelist:medicinelist,errors

  })
 }
 else {
  try {
    // Start the transaction
    transaction = await db.sequelize.transaction();
    const saledata =JSON.parse(rowmaterialamountobjarray)

    
    // Iterate through the row material amount objects
    for (const item of saledata) {
        const existingProduct = await db.Inventory.findOne({
            where: { medicineid:item.medicineId,batchno:item.batchNo, warehouseid:req.user.shopwareid, productcode:item.productCode, },
            transaction: transaction
        });
       const invlog ={
          invid: uuidv4(),
          warehouseid:req.user.shopwareid,
          medicineid:item.medicineId,
          quantity:item.quantity,
          supplierid:'',
          batchno:item.batchNo,
          expirydate : item.expiryDate,
          manufuctureddate: item.expiryDate,
          productcode:item.productCode,
          packagetype: item.package,
          sellprice:parseFloat(item.sellPrice),
          costprice:parseFloat(item.costPrice),
          totalcost:parseFloat(item.totalcost)
        }
        const puchase = {
          invid:   uuidv4(),
          storedin:req.user.shopwareid,
          medicineid:item.medicineId,
          quantity:item.quantity,
          supplierid:'',
          batchno:item.batchNo,
          expirydate : item.expiryDate,
          manufuctureddate: item.expiryDate,
          productcode:item.productCode,
          packagetype: item.package,
          sellprice:parseFloat(item.sellPrice),
        costprice:parseFloat(item.costPrice),
        totalcost:parseFloat(item.totalcost),
        paymenttype:item.paymenttype,
        creditamount:parseFloat(item.creditamount),
        iscreditpayed:item.paymenttype==="Cash"?"Yes":"No"
        };
        // Update the row material amount in the database
        if (existingProduct) {
            // Calculate the new totamount by subtracting item.amount
            const newTotAmount = parseFloat(existingProduct.quantity) + parseFloat(item.quantity);
             
            // Update the row material totamount in the database
            await db.Inventory.update(
              { quantity: newTotAmount },
              { where: { medicineid:item.medicineId,batchno:item.batchNo,
                warehouseid:req.user.shopwareid,
                productcode:item.productCode }, transaction: transaction }
          );
          await db.InventoryLog.create(invlog,{ transaction: transaction });
          await db.Purchase.create(puchase,{ transaction: transaction });
        }else{
          const invData = {
            invid:   uuidv4(),
            warehouseid:req.user.shopwareid,
            medicineid:item.medicineId,
            quantity:item.quantity,
            supplierid:'',
            batchno:item.batchNo,
            expirydate : item.expiryDate,
            manufuctureddate: item.expiryDate,
            productcode:item.productCode,
            packagetype: item.package,
            sellprice:parseFloat(item.sellPrice),
          costprice:parseFloat(item.costPrice),
          totalcost:parseFloat(item.totalcost)
    
          };
         
         await db.Inventory.create(invData,{transaction,transaction})
         await db.InventoryLog.create(invlog,{ transaction: transaction });
         await db.Purchase.create(puchase,{ transaction: transaction });
        }
    }

   
    

    // Commit the transaction
    await transaction.commit();
    res.render('invaddnewproduct',{medicinecategorylist:medicinecategorylist,
      medicinegenericinamelist:medicinegenericinamelist,
      supplierlist:supplierlist,
      manufucturerlist:manufucturerlist,
      shoplist:shoplist,
      success_msg:'Successfully add new medicine info to inventory',
      warehouselist:warehouselist,
      medicinelist:medicinelist,
      user:req.user,
  
    })
} catch (error) {
    console.log(error)
    // Handle any errors that occurred during the transaction
    if (transaction) {
        await transaction.rollback(); // Rollback the transaction if an error occurs
    }

    res.render('invaddnewproduct',{medicinecategorylist:medicinecategorylist,
      medicinegenericinamelist:medicinegenericinamelist,
      supplierlist:supplierlist,
      manufucturerlist:manufucturerlist,
      shoplist:shoplist,
      user:req.user,
      warehouselist:warehouselist,
      medicinelist:medicinelist,
      error_msg:'Error while adding new medicine info to inventory',
    })
}
 }
  
});




router.get('/addotherproducttoinventory', ensureAuthenticated, async (req, res) => {
  const medicinecategorylist = await db.MedicineCategory.findAll({where:{ producttag:'Other'}});
  const medicinegenericinamelist = await db.MedicineGenericName.findAll({where:{ producttag:'Other'}});
  const supplierlist = await db.MedicineSupplier.findAll({});
  const warehouselist = await db.Warehouse.findAll({});
  const shoplist = await db.Shop.findAll({});
  const [medicinelist,mlm] = await db.sequelize.query(`
  select * from MedicineInfos 
  inner join MedicineCategories on categoryid = medicinecategory 
  inner join MedicineGenericNames on drugid = medicinegenericname 
  inner join MedicineManufucturers on manufuctureid = medicinemanufucturer
  where MedicineInfos.producttag='Other'
  `)
  const manufucturerlist = await db.MedicineManufucturer.findAll({where:{ producttag:'Other'}});
  res.render('invaddotherproduct',{medicinecategorylist:medicinecategorylist,
    medicinegenericinamelist:medicinegenericinamelist,
    supplierlist:supplierlist,
    user:req.user,
    manufucturerlist:manufucturerlist,
    shoplist:shoplist,
    warehouselist:warehouselist,
    medicinelist:medicinelist

  })
});

router.post('/addotherproducttoinventory', ensureAuthenticated, async (req, res) => {
  const {rowmaterialamountobjarray} =req.body;
  const medicinecategorylist = await db.MedicineCategory.findAll({where:{ producttag:'Other'}});
  const medicinegenericinamelist = await db.MedicineGenericName.findAll({where:{ producttag:'Other'}});
  const supplierlist = await db.MedicineSupplier.findAll({});
  const warehouselist = await db.Warehouse.findAll({});
  const shoplist = await db.Shop.findAll({});
  const [medicinelist,mlm] = await db.sequelize.query(`
  select * from MedicineInfos 
  inner join MedicineCategories on categoryid = medicinecategory 
  inner join MedicineGenericNames on drugid = medicinegenericname 
  inner join MedicineManufucturers on manufuctureid = medicinemanufucturer
  where MedicineInfos.producttag='Other'
  `)
  console.log(rowmaterialamountobjarray)
  const manufucturerlist = await db.MedicineManufucturer.findAll({where:{ producttag:'Other'}});
let errors =[];
  if (!rowmaterialamountobjarray ) {
    errors.push({msg:'Please enter all required fields'})
 } 


 if(errors.length >0){
   
  res.render('invaddotherproduct',{medicinecategorylist:medicinecategorylist,
    medicinegenericinamelist:medicinegenericinamelist,
    supplierlist:supplierlist,
    manufucturerlist:manufucturerlist,
    shoplist:shoplist,
    user:req.user,
    warehouselist:warehouselist,
    medicinelist:medicinelist,errors

  })
 }
 else {
  try {
    // Start the transaction
    transaction = await db.sequelize.transaction();
    const saledata =JSON.parse(rowmaterialamountobjarray)

    
    // Iterate through the row material amount objects
    for (const item of saledata) {
      const existingProduct = await db.Inventory.findOne({
        where: { medicineid:item.medicineId, warehouseid:req.user.shopwareid, productcode:item.productCode, },
        transaction: transaction
    });
       const invlog ={
          invid: uuidv4(),
          warehouseid:req.user.shopwareid,
          medicineid:item.medicineId,
          quantity:item.quantity,
          supplierid:'',
          batchno:'',
          expirydate : item.expiryDate,
          manufuctureddate:item.expiryDate,
          productcode:item.productCode,
          packagetype: item.package,
          sellprice:item.sellPrice,
          costprice:item.costPrice,
          totalcost:item.totalcost
        }
        const puchase = {
          invid:   uuidv4(),
          storedin:req.user.shopwareid,
          medicineid:item.medicineId,
          quantity:item.quantity,
          supplierid:'',
          batchno:'',
          expirydate : item.expiryDate,
          manufuctureddate: item.expiryDate,
          productcode:item.productCode,
          packagetype: item.package,
          sellprice:parseFloat(item.sellPrice),
        costprice:parseFloat(item.costPrice),
        totalcost:parseFloat(item.totalcost),
        paymenttype:item.paymenttype,
        creditamount:parseFloat(item.creditamount),
        iscreditpayed:item.paymenttype==="Cash"?"Yes":"No"
        };
        // Update the row material amount in the database
        if (existingProduct) {
            // Calculate the new totamount by subtracting item.amount
            const newTotAmount = parseFloat(existingProduct.quantity) + parseFloat(item.quantity);
             
            // Update the row material totamount in the database
            await db.Inventory.update(
              { quantity: newTotAmount },
              { where: { medicineid:item.medicineId,
                warehouseid:req.user.shopwareid,
                productcode:item.productCode }, transaction: transaction }
          );
          await db.InventoryLog.create(invlog,{ transaction: transaction });
          await db.Purchase.create(puchase,{ transaction: transaction });
        }else{
          const invData = {
            invid:   uuidv4(),
            warehouseid:req.user.shopwareid,
            medicineid:item.medicineId,
            quantity:item.quantity,
            supplierid:'',
            batchno:'',
            expirydate : item.expiryDate,
            manufuctureddate:item.expiryDate,
            productcode:item.productCode,
            packagetype: item.package,
            sellprice:item.sellPrice,
            costprice:item.costPrice,
            totalcost:item.totalcost
    
          };
         
          await db.Inventory.create(invData,{transaction,transaction})
          await db.InventoryLog.create(invlog,{ transaction: transaction });
          await db.Purchase.create(puchase,{ transaction: transaction });
        }
    }

   
    

    // Commit the transaction
    await transaction.commit();
    res.render('invaddotherproduct',{medicinecategorylist:medicinecategorylist,
      medicinegenericinamelist:medicinegenericinamelist,
      supplierlist:supplierlist,
      manufucturerlist:manufucturerlist,
      shoplist:shoplist,
      success_msg:'Successfully add new product info to inventory',
      warehouselist:warehouselist,
      medicinelist:medicinelist,
      user:req.user,
  
    })
} catch (error) {
    console.log(error)
    // Handle any errors that occurred during the transaction
    if (transaction) {
        await transaction.rollback(); // Rollback the transaction if an error occurs
    }

    res.render('invaddotherproduct',{medicinecategorylist:medicinecategorylist,
      medicinegenericinamelist:medicinegenericinamelist,
      supplierlist:supplierlist,
      manufucturerlist:manufucturerlist,
      shoplist:shoplist,
      user:req.user,
      warehouselist:warehouselist,
      medicinelist:medicinelist,
      error_msg:'Error while adding new product info to inventory',
    })
}
 }
  
});





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
res.render('otherproductinventorylist',{shoplist:shoplist,inventory:inventory,warelist:warelist,
inventorytot:inventorytotcurrent,
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
  InventoryLogs.*,medicinename,medicinecategoryname,genericname,suppliertype
FROM InventoryLogs
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid

where MedicineInfos.producttag='Other'  and warehouseid = '${req.user.shopwareid}'  
  `);
res.render('inventorylogotherproduct',{shoplist:shoplist,inventory:inventory,warelist:warelist, user:req.user,})
}) 
router.post('/searchfilterinventorydata',ensureAuthenticated,async (req,res) =>{
  const {enddate,startdate,shopnames} =req.body;
  const currentDate = new Date();
const startOfDay = new Date(startdate);
const endOfDay = new Date(enddate);

  const [inventory,mlm] = await db.sequelize.query(`
  select
  InventoryLogs.*,medicinename,medicinecategoryname,genericname,suppliertype
  FROM InventoryLogs
  inner join MedicineInfos on MedicineInfos.medid = InventoryLogs.medicineid
  inner join MedicineCategories on categoryid = MedicineInfos.medicinecategory 
  inner join MedicineGenericNames on drugid = MedicineInfos.medicinegenericname 

  inner join MedicineManufucturers on manufuctureid = MedicineInfos.medicinemanufucturer
  where warehouseid = '${req.user.shopwareid}' and  MedicineInfos.suppliertype='Type_I' and InventoryLogs.createdAt between '${startdate}' and '${enddate}' 
  `);
  res.render('inventorytransaction',{inventory:inventory, user:req.user,})
})

router.post('/searchfilterotherproductinvdata',ensureAuthenticated,async (req,res) =>{
  const {enddate,startdate,shopnames} =req.body;
  const currentDate = new Date();
const startOfDay = new Date(startdate);
const endOfDay = new Date(enddate);
const warelist = await db.Warehouse.findAll({});
const shoplist = await db.Shop.findAll({});
    
  const [inventory,mlm] = await db.sequelize.query(`
  SELECT 
  InventoryLogs.*,medicinename,medicinecategoryname,genericname,suppliertype
FROM InventoryLogs
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid

  where  InventoryLogs.createdAt between '${startdate}' and '${enddate}' and MedicineInfos.producttag='Other' and warehouseid = '${req.user.shopwareid}' 
  `);
  res.render('inventorylogotherproduct',{shoplist:shoplist,inventory:inventory, warelist:warelist,user:req.user,})
})
module.exports = router;