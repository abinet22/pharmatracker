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

  const warehouselist = await db.Warehouse.findAll({});
  const shoplist = await db.Shop.findAll({});
  const [medicinelist,mlm] = await db.sequelize.query(`
  select * from MedicineInfos 
  inner join MedicineCategories on categoryid = medicinecategory 
  inner join MedicineGenericNames on drugid = medicinegenericname 
  inner join MedicineManufucturers on manufuctureid = medicinemanufucturer
  where MedicineInfos.producttag ='Medicine'
  `)
  console.log(medicinelist)
  const manufucturerlist = await db.MedicineManufucturer.findAll({});
  res.render('addnewproduct',{medicinecategorylist:'',
    medicinegenericinamelist:'',
    supplierlist:'',
    user:req.user,
    manufucturerlist:'',
    shoplist:shoplist,
    warehouselist:warehouselist,
    medicinelist:medicinelist

  })
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
  res.render('addotherproducttoinventory',{medicinecategorylist:medicinecategorylist,
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
   
  res.render('addnewproduct',{medicinecategorylist:medicinecategorylist,
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
        where: { medicineid:item.medicineId,batchno:item.batchNo, warehouseid:item.inventoryName, productcode:item.productCode, },
        transaction: transaction
    });
       const invlog ={
          invid: uuidv4(),
          warehouseid:item.inventoryName,
          medicineid:item.medicineId,
          quantity:item.quantity,
          supplierid:'TypeIorII',
          batchno:item.batchNo,
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
          storedin:item.inventoryName,
          medicineid:item.medicineId,
          quantity:item.quantity,
          supplierid:'TypeIorII',
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
                warehouseid:item.inventoryName,
                productcode:item.productCode }, transaction: transaction }
          );
          await db.InventoryLog.create(invlog,{ transaction: transaction });
          await db.Purchase.create(puchase,{ transaction: transaction });
        }else{
          const invData = {
            invid:   uuidv4(),
            warehouseid:item.inventoryName,
            medicineid:item.medicineId,
            quantity:item.quantity,
            supplierid:'TypeIorII',
            batchno:item.batchNo,
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
    res.render('addnewproduct',{medicinecategorylist:medicinecategorylist,
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

    res.render('addnewproduct',{medicinecategorylist:medicinecategorylist,
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
   
  res.render('addotherproducttoinventory',{medicinecategorylist:medicinecategorylist,
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
        where: { medicineid:item.medicineId, warehouseid:item.inventoryName, productcode:item.productCode, },
        transaction: transaction
    });
       const invlog ={
          invid: uuidv4(),
          warehouseid:item.inventoryName,
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
          storedin:item.inventoryName,
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
                warehouseid:item.inventoryName,
                productcode:item.productCode }, transaction: transaction }
          );
          await db.InventoryLog.create(invlog,{ transaction: transaction });
          await db.Purchase.create(puchase,{ transaction: transaction });
        }else{
          const invData = {
            invid:   uuidv4(),
            warehouseid:item.inventoryName,
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
    res.render('addotherproducttoinventory',{medicinecategorylist:medicinecategorylist,
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

    res.render('addotherproducttoinventory',{medicinecategorylist:medicinecategorylist,
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
  where MedicineInfos.producttag !='Other'
  group by medicinename,medicinecategoryname,genericname,location_name,medicineid,warehouseid
    `);
  const [inventory,mlm] = await db.sequelize.query(`
  SELECT Inventories.invid,warehouseid,
  manufuctureddate,expirydate,productcode,batchno,quantity,medicineid,medicinename,medicinecategoryname,genericname,suppliertype,
  COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
  FROM Inventories
  INNER JOIN MedicineInfos ON medid = medicineid
  INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
  INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid
  LEFT JOIN Shops ON Shops.shopid = Inventories.warehouseid
  LEFT JOIN Warehouses ON Warehouses.invid = Inventories.warehouseid
  where  MedicineInfos.producttag !='Other'
  `);
  const itemsPerPage = 20; // Number of items per page
  const currentPage = req.query.page ? parseInt(req.query.page) : 0;
  
  // Calculate the slice of joblist to display for the current page
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const inventorytotcurrent = inventorytot.slice(startIndex, endIndex);
res.render('admincurrentinventorylist',{shoplist:shoplist,inventory:inventory,warelist:warelist,
inventorytot:inventorytot,
currentPage: currentPage,
totalPages: Math.ceil(inventorytot.length / itemsPerPage),
user:req.user,})
});
router.get('/inventorylisttypei',ensureAuthenticated,async (req,res) =>{
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
where  MedicineInfos.suppliertype='Type_I' and MedicineInfos.producttag !='Other'
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
where MedicineInfos.suppliertype='Type_I' and MedicineInfos.producttag !='Other'
`);
const itemsPerPage = 20; // Number of items per page
    const currentPage = req.query.page ? parseInt(req.query.page) : 0;
    
    // Calculate the slice of joblist to display for the current page
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const inventorytotcurrent = inventorytot.slice(startIndex, endIndex);
res.render('admincurrentinventorylist',{shoplist:shoplist,inventory:inventory,warelist:warelist,
  inventorytot:inventorytot,
  currentPage: currentPage,
  totalPages: Math.ceil(inventorytot.length / itemsPerPage),
  user:req.user,})
})
router.get('/inventorylisttypeii',ensureAuthenticated,async (req,res) =>{
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
where MedicineInfos.suppliertype='Type_II' and MedicineInfos.producttag !='Other'
group by medicinename,medicinecategoryname,genericname,location_name,medicineid,warehouseid
  `);
const [inventory,mlm] = await db.sequelize.query(`
SELECT Inventories.invid,warehouseid,
manufuctureddate,expirydate,productcode,batchno,suppliertype,quantity,medicineid,medicinename,medicinecategoryname,genericname,
COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM Inventories
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid

LEFT JOIN Shops ON Shops.shopid = Inventories.warehouseid
LEFT JOIN Warehouses ON Warehouses.invid = Inventories.warehouseid
where MedicineInfos.suppliertype='Type_II' and MedicineInfos.producttag !='Other'
`);
    const itemsPerPage = 20; // Number of items per page
    const currentPage = req.query.page ? parseInt(req.query.page) : 0;
    
    // Calculate the slice of joblist to display for the current page
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const inventorytotcurrent = inventorytot.slice(startIndex, endIndex);
res.render('admincurrentinventorylist',{shoplist:shoplist,inventory:inventory,warelist:warelist,
  inventorytot:inventorytot,
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
where MedicineInfos.producttag='Other'
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
where MedicineInfos.producttag='Other'
`);
const itemsPerPage = 20; // Number of items per page
const currentPage = req.query.page ? parseInt(req.query.page) : 0;

// Calculate the slice of joblist to display for the current page
const startIndex = currentPage * itemsPerPage;
const endIndex = startIndex + itemsPerPage;
const inventorytotcurrent = inventorytot.slice(startIndex, endIndex);
res.render('otherproductinventorylist',{shoplist:shoplist,inventory:inventory,warelist:warelist,
inventorytot:inventorytot,
currentPage: currentPage,
totalPages: Math.ceil(inventorytot.length / itemsPerPage),
user:req.user,})
});
router.get('/inventorylog',ensureAuthenticated,async (req,res) =>{
    const warelist = await db.Warehouse.findAll({});
    const shoplist = await db.Shop.findAll({});
    
    const [inventory,mlm] = await db.sequelize.query(`

    SELECT 
    InventoryLogs.*,medicinename,medicinecategoryname,genericname,suppliertype,
  COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM InventoryLogs
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid

LEFT JOIN Shops ON Shops.shopid = InventoryLogs.warehouseid
LEFT JOIN Warehouses ON Warehouses.invid = InventoryLogs.warehouseid
    `);
  res.render('admininventorytransaction',{shoplist:shoplist,inventory:inventory,warelist:warelist, user:req.user,})
}) 
router.get('/inventorylogotherproduct',ensureAuthenticated,async (req,res) =>{
  const warelist = await db.Warehouse.findAll({});
  const shoplist = await db.Shop.findAll({});
  
  const [inventory,mlm] = await db.sequelize.query(`

  SELECT 
  InventoryLogs.*,medicinename,medicinecategoryname,genericname,
COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM InventoryLogs
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid
LEFT JOIN Shops ON Shops.shopid = InventoryLogs.warehouseid
LEFT JOIN Warehouses ON Warehouses.invid = InventoryLogs.warehouseid
where MedicineInfos.producttag='Other'
  `);
res.render('admininventorylogotherproduct',{shoplist:shoplist,inventory:inventory,warelist:warelist, user:req.user,})
}) 
router.post('/searchfilterinventorydata',ensureAuthenticated,async (req,res) =>{
  const {enddate,startdate,shopnames} =req.body;
  const currentDate = new Date();
const startOfDay = new Date(startdate);
const endOfDay = new Date(enddate);
const warelist = await db.Warehouse.findAll({});
const shoplist = await db.Shop.findAll({});
    
  const [inventory,mlm] = await db.sequelize.query(`
  SELECT 
  InventoryLogs.*,medicinename,medicinecategoryname,genericname,suppliertype,
COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM InventoryLogs
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid

LEFT JOIN Shops ON Shops.shopid = InventoryLogs.warehouseid
LEFT JOIN Warehouses ON Warehouses.invid = InventoryLogs.warehouseid
  where  InventoryLogs.createdAt between '${startdate}' and '${enddate}' 
  `);
  res.render('admininventorytransaction',{shoplist:shoplist,inventory:inventory, warelist:warelist,user:req.user,})
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
  InventoryLogs.*,medicinename,medicinecategoryname,genericname,
COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM InventoryLogs
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid
LEFT JOIN Shops ON Shops.shopid = InventoryLogs.warehouseid
LEFT JOIN Warehouses ON Warehouses.invid = InventoryLogs.warehouseid
  where  InventoryLogs.createdAt between '${startdate}' and '${enddate}' and MedicineInfos.producttag='Other'
  `);
  res.render('admininventorylogotherproduct',{shoplist:shoplist,inventory:inventory, warelist:warelist,user:req.user,})
})
//sales
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
    console.log('Ethiopian Start Date:', formattedDatestart);
    console.log('Ethiopian End Date:', formattedDateend);
  const [salelist, sdlm] = await db.sequelize.query(`
  SELECT  SalesData.*,medicinename,fullname,shopname,SalesData.createdAt
  FROM SalesData
  inner join Users on staffid = soldby
  inner join Shops on SalesData.shopid= Shops.shopid
  INNER JOIN MedicineInfos ON SalesData.medicineid = MedicineInfos.medid
  WHERE SalesData.createdAt BETWEEN '${formattedDatestart}' AND '${formattedDateend}' order by createdAt desc
  
  `);
  const [todaysalesbyshop,dm] =await db.sequelize.query(`
  select Shops.shopname,sum(SalesData.totalpayable) as quantity  from  SalesData
  
  inner join Shops on SalesData.shopid = Shops.shopid
  where  SalesData.createdAt between '${formattedDatestart}' and '${formattedDateend}' group by Shops.shopname

  `);
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
   res.render('admintodaysalestransaction',{
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
  `);
  const shopname = await db.Shop.findAll({});
const username = await db.User.findAll({});


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
   res.render('adminallsalestransaction',{todaysalesbyvalue:todaysalesbyvalue,
    salesDataByDate: salesDataByDate,
    fromdate:'',
    todate:'',
    filterreport:"off",
    alltimesalesbyvalue:alltimesalesbyvalue,
    alltimesalesbyquantity:alltimesalesbyquantity,
    todaysalesbyquantity:todaysalesbyquantity, todaysalesbyshop:todaysalesbyshop,
    username:username,salelist:salelist,shopname:shopname,user:req.user,inventory:inventory})
})

router.post('/searchfiltersalesdata',ensureAuthenticated,async (req,res) =>{

    const {enddate,startdate,shopnames} =req.body;
    const [inventory,mlm] = await db.sequelize.query(`
    select * from  Inventories
  inner join MedicineInfos on MedicineInfos.medid = Inventories.medicineid
  inner join MedicineCategories on categoryid = MedicineInfos.medicinecategory 
  inner join MedicineGenericNames on drugid = MedicineInfos.medicinegenericname 
  inner join MedicineManufucturers on manufuctureid = MedicineInfos.medicinemanufucturer
  
    `);
const shopname = await db.Shop.findAll({where:{shopid:shopnames}})
const username = await db.User.findAll({})
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
if(!enddate || !startdate || !shopnames || shopnames ==="0"){
 
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
  res.render('adminallsalestransaction',{error_msg:"Please select all required fields",todaysalesbyvalue:todaysalesbyvalue,todaysalesbyquantity:todaysalesbyquantity,
  todaysalesbyshop:todaysalesbyshop,username:username,salelist:salelist,
  salesDataByDate: salesDataByDate,
  fromdate:'',
  todate:'',
  todaysalesbyvaluef:'',
todaysalesbyquantityf:'',
  filterreport:'off',
  alltimesalesbyvalue:alltimesalesbyvalue,
  alltimesalesbyquantity:alltimesalesbyquantity,
  shopname:shopname,user:req.user,inventory:inventory})
     
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
  console.log(startOfDay)
  console.log(endOfDay)
  console.log(startdate)
  console.log(enddate)
  console.log(currentDate)
  console.log(currentDate2)
const [salelist, sdlm] = await db.sequelize.query(`
SELECT  *
FROM SalesData
inner join Users on staffid = soldby
inner join Shops on SalesData.shopid= Shops.shopid
INNER JOIN MedicineInfos ON SalesData.medicineid = MedicineInfos.medid
WHERE SalesData.createdAt BETWEEN '${formatDateTime(startOfDay)}' AND '${formatDateTime(endOfDay)}' and SalesData.shopid ='${shopnames}'
order by SalesData.createdAt desc
`);
const [todaysalesbyshop,dm] =await db.sequelize.query(`
select Shops.shopname,sum(SalesData.totalpayable) as quantity  from  SalesData

inner join Shops on SalesData.shopid = Shops.shopid
where  SalesData.createdAt between '${formatDateTime(startOfDay)}' and '${formatDateTime(endOfDay)}' group by Shops.shopname

`);
const [todaysalesbyquantityf,dfmq] =await db.sequelize.query(`
select medicinename,sum(SalesData.quantity) as quantity  from  SalesData

inner join MedicineInfos on MedicineInfos.medid = SalesData.medicineid
where  SalesData.createdAt between '${formatDateTime(startOfDay)}' and '${formatDateTime(endOfDay)}' group by medicinename order by quantity desc limit 5

`)

const [todaysalesbyvaluef,dfmv] =await db.sequelize.query(`
select medicinename,sum(SalesData.totalpayable) as quantity  from  SalesData

inner join MedicineInfos on MedicineInfos.medid = SalesData.medicineid
where  SalesData.createdAt between '${formatDateTime(startOfDay)}' and '${formatDateTime(endOfDay)}' group by medicinename order by quantity desc limit 5

`);
const [alltimesalesbyquantity,amq] =await db.sequelize.query(`
select medicinename,sum(SalesData.quantity) as quantity  from  SalesData

inner join MedicineInfos on MedicineInfos.medid = SalesData.medicineid
 group by medicinename order by quantity desc limit 5

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
const [alltimesalesbyvalue,amv] =await db.sequelize.query(`
select medicinename,sum(SalesData.totalpayable) as quantity  from  SalesData

inner join MedicineInfos on MedicineInfos.medid = SalesData.medicineid
 group by medicinename order by quantity desc limit 5

`);
res.render('adminallsalestransaction',{todaysalesbyvalue:todaysalesbyvalue,
  todaysalesbyquantity:todaysalesbyquantity,todaysalesbyshop:todaysalesbyshop,
  username:username,salelist:salelist,
  fromdate:formatDateTime(startOfDay),
  todate:formatDateTime(endOfDay),
  todaysalesbyvaluef:todaysalesbyvaluef,
todaysalesbyquantityf:todaysalesbyquantityf,
  filterreport:'on',
  alltimesalesbyvalue:alltimesalesbyvalue,
  alltimesalesbyquantity:alltimesalesbyquantity,
  salesDataByDate: salesDataByDate,
  shopname:shopname,user:req.user,inventory:inventory})
   
}
 
})

router.get('/report',ensureAuthenticated,async (req,res) =>{
  const warelist = await db.Warehouse.findAll({})
  const shoplist = await db.Shop.findAll({})
res.render('report',{user:req.user,shoplist:shoplist,warelist:warelist})
})
router.get('/statistics',ensureAuthenticated,async (req,res) =>{
  const warelist = await db.Warehouse.findAll({})
  const shoplist = await db.Shop.findAll({})
res.render('statistics',{user:req.user,shoplist:shoplist,warelist:warelist})
})

router.post('/deleteinventory/(:invid)',ensureAuthenticated,async (req,res) =>{
  const warelist = await db.Warehouse.findAll({});
  const shoplist = await db.Shop.findAll({});
  
const [inventory,mlm] = await db.sequelize.query(`
SELECT 
Inventories.*,medicinename,medicinecategoryname,genericname,suppliertype,
COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM Inventories
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid

LEFT JOIN Shops ON Shops.shopid = Inventories.warehouseid
LEFT JOIN Warehouses ON Warehouses.invid = Inventories.warehouseid
`);
db.Inventory.findOne({where:{invid:req.params.invid}}).then(inv =>{
if(inv){
  db.Inventory.destroy({where:{invid:req.params.invid}}).then(dlt =>{
    res.render('admincurrentinventorylist',{success_msg:'Successfully delete inventory with this id',shoplist:shoplist,inventory:inventory,warelist:warelist, user:req.user,})

  }).catch(err =>{
    res.render('admincurrentinventorylist',{error_msg:'Error while deleting inventory with this id',shoplist:shoplist,inventory:inventory,warelist:warelist, user:req.user,})

  })
}else{
  res.render('admincurrentinventorylist',{error_msg:'Cant find inventory with this id',shoplist:shoplist,inventory:inventory,warelist:warelist, user:req.user,})

}
}).catch(err =>{
  res.render('admincurrentinventorylist',{ error_msg:'Error while finding inventory with this id',shoplist:shoplist,inventory:inventory,warelist:warelist, user:req.user,})

})

});
router.get('/wallet',ensureAuthenticated,async (req,res)=>{
  const [purchaselistcreditpayed,payedm] = await db.sequelize.query(`
SELECT 
Purchases.*,medicinename,medicinecategoryname,genericname,suppliertype,
COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM Purchases
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid

LEFT JOIN Shops ON Shops.shopid = Purchases.storedin
LEFT JOIN Warehouses ON Warehouses.invid = Purchases.storedin
where iscreditpayed='Yes' and paymenttype='Credit'
`);
const [purchaselistcashbank,cash] = await db.sequelize.query(`
SELECT 
Purchases.*,medicinename,medicinecategoryname,genericname,suppliertype,
COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM Purchases
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid

LEFT JOIN Shops ON Shops.shopid = Purchases.storedin
LEFT JOIN Warehouses ON Warehouses.invid = Purchases.storedin
where paymenttype='Cash' and iscreditpayed='Yes'
`);
const [purchaselistcredit,credit] = await db.sequelize.query(`
SELECT 
Purchases.*,medicinename,medicinecategoryname,genericname,suppliertype,
COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM Purchases
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid

LEFT JOIN Shops ON Shops.shopid = Purchases.storedin
LEFT JOIN Warehouses ON Warehouses.invid = Purchases.storedin
where iscreditpayed='No' and paymenttype='Credit'
`);
const [creditp,cm] =await db.sequelize.query(`
select count(invid) as count,sum(creditamount) as total from Purchases where  iscreditpayed='No' and paymenttype='Credit'
`)
const [payedp,pm] = await db.sequelize.query(`
select count(invid) as count,sum(creditamount)  as total from Purchases where  iscreditpayed='Yes' and paymenttype='Credit'
`)
const [cashp,cmp] = await db.sequelize.query(`
select count(invid) as count,sum(totalcost)  as total from Purchases where   paymenttype='Cash'
`)
 res.render('wallet',{purchaselistcredit:purchaselistcredit,
  purchaselistcreditpayed:purchaselistcreditpayed,user:req.user,
  purchaselistcash:purchaselistcashbank,cash:cashp,payed:payedp,credit:creditp,
})
})

router.post('/paycreditpuchase/(:invid)',ensureAuthenticated,async (req,res)=>{
  const [purchaselistcreditpayed,payedm] = await db.sequelize.query(`
SELECT 
Purchases.*,medicinename,medicinecategoryname,genericname,suppliertype,
COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM Purchases
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid

LEFT JOIN Shops ON Shops.shopid = Purchases.storedin
LEFT JOIN Warehouses ON Warehouses.invid = Purchases.storedin
where iscreditpayed='Yes' and paymenttype='Credit'
`);
const [purchaselistcashbank,cash] = await db.sequelize.query(`
SELECT 
Purchases.*,medicinename,medicinecategoryname,genericname,suppliertype,
COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM Purchases
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid

LEFT JOIN Shops ON Shops.shopid = Purchases.storedin
LEFT JOIN Warehouses ON Warehouses.invid = Purchases.storedin
where paymenttype='Cash' and iscreditpayed='Yes'
`);
const [purchaselistcredit,credit] = await db.sequelize.query(`
SELECT 
Purchases.*,medicinename,medicinecategoryname,genericname,suppliertype,
COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM Purchases
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid

LEFT JOIN Shops ON Shops.shopid = Purchases.storedin
LEFT JOIN Warehouses ON Warehouses.invid = Purchases.storedin
where iscreditpayed='No' and paymenttype='Credit'
`);
const [creditp,cm] =await db.sequelize.query(`
select count(invid) as count,sum(creditamount) as total from Purchases where  iscreditpayed='No' and paymenttype='Credit'
`)
const [payedp,pm] = await db.sequelize.query(`
select count(invid) as count,sum(creditamount)  as total from Purchases where  iscreditpayed='Yes' and paymenttype='Credit'
`)
const [cashp,cmp] = await db.sequelize.query(`
select count(invid) as count,sum(totalcost)  as total from Purchases where   paymenttype='Cash'
`)
db.Purchase.findOne({where:{invid:req.params.invid,iscreditpayed:'No'}}).then(pur =>{
  if(pur){
    db.Purchase.update({iscreditpayed:'Yes'},{where:{invid:req.params.invid}}).then(newpur =>{
      if(newpur){
        res.render('wallet',{purchaselistcredit:purchaselistcredit,
          purchaselistcreditpayed:purchaselistcreditpayed,user:req.user,
          purchaselistcash:purchaselistcashbank,
          cash:cashp,payed:payedp,credit:creditp,
          success_msg:'Successfully update purchase info with this id'
        })
      }else{
        res.render('wallet',{purchaselistcredit:purchaselistcredit,
          purchaselistcreditpayed:purchaselistcreditpayed,user:req.user,
          purchaselistcash:purchaselistcashbank,
          cash:cashp,payed:payedp,credit:creditp,
          error_msg:'Error updating purchase info with this id try again'
        })
      }
    }).catch(err =>{
      res.render('wallet',{purchaselistcredit:purchaselistcredit,
        purchaselistcreditpayed:purchaselistcreditpayed,user:req.user,
        purchaselistcash:purchaselistcashbank,
        cash:cashp,payed:payedp,credit:creditp,
        error_msg:'Error while unpdating purchase info with this id'
      })
    })
  }else{
    res.render('wallet',{purchaselistcredit:purchaselistcredit,
      purchaselistcreditpayed:purchaselistcreditpayed,user:req.user,
      purchaselistcash:purchaselistcashbank,
      cash:cashp,payed:payedp,credit:creditp,
      error_msg:'Cant finding purchase info with this id'
    })
  }
}).catch(err =>{
  res.render('wallet',{purchaselistcredit:purchaselistcredit,
    purchaselistcreditpayed:purchaselistcreditpayed,user:req.user,
    purchaselistcash:purchaselistcashbank,
    cash:cashp,payed:payedp,credit:creditp,
    error_msg:'Error while finding purchase info with this id'
  })
})

})

router.get('/transfermedicineproduct', ensureAuthenticated, async (req, res) => {
 
  const warehouselist = await db.Warehouse.findAll({});
  const shoplist = await db.Shop.findAll({});
  
  res.render('transfermedicinechooseinventory',{
    warehouselist:warehouselist,
    shoplist:shoplist,
    user:req.user,
  })
}); 
router.post('/transfertoinventory', ensureAuthenticated, async (req, res) => {
 
  const {frominventory,toinventory} =req.body;
  const warehouselist = await db.Warehouse.findAll({});
  const shoplist = await db.Shop.findAll({});
  if(frominventory==="0" || toinventory ==="0"){
    res.render('transfermedicinechooseinventory',{
      warehouselist:warehouselist,
      shoplist:shoplist,
      user:req.user,
      error_msg:'Please select inventory or shop you want to transfer products'
    })
  }
  else{
    const medicinecategorylist = await db.MedicineCategory.findAll({});
  const medicinegenericinamelist = await db.MedicineGenericName.findAll({});
  const supplierlist = await db.MedicineSupplier.findAll({});
  const warehouselist = await db.Warehouse.findAll({});
  const shoplist = await db.Shop.findAll({});
  const [medicinelist,mlm] = await db.sequelize.query(`
  select * from MedicineInfos 
  inner join Inventories on medicineid = medid
  where quantity > 0 and warehouseid = '${frominventory}'
  `);
  const [frominv,imts] = await db.sequelize.query(`
SELECT 
COALESCE(Shops.shopname, Warehouses.inventoryname) AS fromlocation_name
FROM Inventories

LEFT JOIN Shops ON Shops.shopid = Inventories.warehouseid
LEFT JOIN Warehouses ON Warehouses.invid = Inventories.warehouseid
where  warehouseid = '${frominventory}' 
`);
const [toinv,timts] = await db.sequelize.query(`
SELECT 
COALESCE(Shops.shopname, Warehouses.inventoryname) AS tolocation_name
FROM Inventories

LEFT JOIN Shops ON Shops.shopid = Inventories.warehouseid
LEFT JOIN Warehouses ON Warehouses.invid = Inventories.warehouseid
where  warehouseid = '${toinventory}' 
`);
  const inventory = await db.Inventory.findAll({
    where: {
     
      quantity: {
        [db.Sequelize.Op.gte]: 1, 
      },
      warehouseid:frominventory
    },
  });
  console.log(frominv);
  console.log(toinv);

  const manufucturerlist = await db.MedicineManufucturer.findAll({});
  if(toinv !== undefined && toinv !== null  && frominv !== undefined && frominv !== null){
    res.render('transfermedicine',{medicinecategorylist:medicinecategorylist,
      medicinegenericinamelist:medicinegenericinamelist,
      supplierlist:supplierlist,
      manufucturerlist:manufucturerlist,
      shoplist:shoplist,
      user:req.user,
     
      info:'Your Are Transfering Products From'+" "+frominv[0].fromlocation_name +" "+"To"+" " +toinv[0].tolocation_name,
      inventory:inventory,
      warehouselist:warehouselist,
      medicinelist:medicinelist,
      toinventory:toinventory,
        frominventory:frominventory
  
    })
  }else{
    res.render('transfermedicine',{medicinecategorylist:medicinecategorylist,
      medicinegenericinamelist:medicinegenericinamelist,
      supplierlist:supplierlist,
      manufucturerlist:manufucturerlist,
      shoplist:shoplist,
      user:req.user,
    
      info:'Cant Find Inventory Try Again',
      inventory:inventory,
      warehouselist:warehouselist,
      medicinelist:medicinelist,
      toinventory:toinventory,
        frominventory:frominventory
  
    })
  }
 
  
  }
});
router.post('/newproducttransfer', ensureAuthenticated, async (req, res) => {

  const {frominventory,toinventory,rowmaterialamountobjarray} = req.body;
  let errors =[];
  const warehouselist = await db.Warehouse.findAll({});
  const shoplist = await db.Shop.findAll({});
  if (!rowmaterialamountobjarray ) {
    errors.push({msg:'Please enter all required fields'})
 } 
 if(!frominventory || !toinventory ){
  errors.push({msg:'Cant find inventories'})
}

 if(errors.length >0){
   
  res.render('transfermedicinechooseinventory',{
    warehouselist:warehouselist,
    shoplist:shoplist,
    user:req.user,
    error_msg:'Please select inventory or shop you want to transfer products'
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
        where: { medicineid:item.medicineId, warehouseid:toinventory, productcode:item.productCode, },
        transaction: transaction
    });
    const fromexistingProduct = await db.Inventory.findOne({
      where: { invid:item.invId},
      transaction: transaction
  });
       const invlog ={
          invid: uuidv4(),
          warehouseid:toinventory,
          medicineid:item.medicineId,
          quantity:item.quantity,
          supplierid:'',
          batchno:fromexistingProduct.batchno,
          expirydate : fromexistingProduct.expiryDate,
          manufuctureddate:fromexistingProduct.expiryDate,
          productcode:item.productCode,
          packagetype: fromexistingProduct.package,
          sellprice:fromexistingProduct.sellPrice,
          costprice:fromexistingProduct.costPrice,
          totalcost:item.totalamount
        }
        
        // Update the row material amount in the database
        if (existingProduct ) {
            // Calculate the new totamount by subtracting item.amount
            const newTotAmount = parseFloat(existingProduct.quantity) + parseFloat(item.quantity);
            const fromnewTotAmount = parseFloat(fromexistingProduct.quantity) - parseFloat(item.quantity);
          
            // Update the row material totamount in the database
            await db.Inventory.update(
              { quantity: newTotAmount },
              { where: { medicineid:item.medicineId,
                warehouseid:toinventory,
                productcode:item.productCode }, transaction: transaction }
          );
          await db.Inventory.update(
            { quantity: fromnewTotAmount },
            { where: { medicineid:item.medicineId,
              warehouseid:frominventory,
              invid:item.invId }, transaction: transaction }
           );
          await db.InventoryLog.create(invlog,{ transaction: transaction });
       
        }else{
          const invData = {
            invid:   uuidv4(),
            warehouseid:toinventory,
            medicineid:item.medicineId,
            quantity:item.quantity,
            supplierid:'',
            batchno:fromexistingProduct.batchno,
            expirydate : fromexistingProduct.expiryDate,
            manufuctureddate:fromexistingProduct.expiryDate,
            productcode:item.productCode,
            packagetype: fromexistingProduct.package,
            sellprice:fromexistingProduct.sellPrice,
            costprice:fromexistingProduct.costPrice,
            totalcost:fromexistingProduct.totalamount
    
          };
          const fromnewTotAmount = parseFloat(fromexistingProduct.quantity) - parseFloat(item.quantity);
          
          await db.Inventory.update(
            { quantity: fromnewTotAmount },
            { where: { medicineid:item.medicineId,
              warehouseid:frominventory,
              invid:item.invId }, transaction: transaction }
           );
          await db.Inventory.create(invData,{transaction,transaction})
          await db.InventoryLog.create(invlog,{ transaction: transaction });
        
        }
    }

   
    

    // Commit the transaction
    await transaction.commit();
    res.render('transfermedicinechooseinventory',{
      warehouselist:warehouselist,
      shoplist:shoplist,
      user:req.user,
      success_msg:'You are successfully transfer products'
    })
} catch (error) {
    console.log(error)
    // Handle any errors that occurred during the transaction
    if (transaction) {
        await transaction.rollback(); // Rollback the transaction if an error occurs
    }

    res.render('transfermedicinechooseinventory',{
      warehouselist:warehouselist,
      shoplist:shoplist,
      user:req.user,
      error_msg:'Error while transfering products from inventories'
    })
}
 }

});

router.post('/updateinventoryqty',ensureAuthenticated,async (req,res) =>{
  const {newqty,invid} = req.body;
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
where MedicineInfos.producttag !='Other'
group by medicinename,medicinecategoryname,genericname,location_name,medicineid,warehouseid
  `);
const [inventory,mlm] = await db.sequelize.query(`
SELECT Inventories.invid,warehouseid,
manufuctureddate,expirydate,productcode,batchno,quantity,medicineid,medicinename,medicinecategoryname,genericname,suppliertype,
COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM Inventories
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid
LEFT JOIN Shops ON Shops.shopid = Inventories.warehouseid
LEFT JOIN Warehouses ON Warehouses.invid = Inventories.warehouseid
where  MedicineInfos.producttag !='Other'
`);
const itemsPerPage = 20; // Number of items per page
const currentPage = req.query.page ? parseInt(req.query.page) : 0;

// Calculate the slice of joblist to display for the current page
const startIndex = currentPage * itemsPerPage;
const endIndex = startIndex + itemsPerPage;
const inventorytotcurrent = inventorytot.slice(startIndex, endIndex);
const isinvthere = await db.Inventory.findOne({where:{invid:invid}});

if(isinvthere){
const udtqty = await db.Inventory.update({quantity:parseFloat(newqty)},{where:{invid:invid}});
if(udtqty){
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
where MedicineInfos.producttag !='Other'
group by medicinename,medicinecategoryname,genericname,location_name,medicineid,warehouseid
  `);
const [inventory,mlm] = await db.sequelize.query(`
SELECT Inventories.invid,warehouseid,
manufuctureddate,expirydate,productcode,batchno,quantity,medicineid,medicinename,medicinecategoryname,genericname,suppliertype,
COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM Inventories
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid
LEFT JOIN Shops ON Shops.shopid = Inventories.warehouseid
LEFT JOIN Warehouses ON Warehouses.invid = Inventories.warehouseid
where  MedicineInfos.producttag !='Other'
`);
  res.render('admincurrentinventorylist',{shoplist:shoplist,inventory:inventory,warelist:warelist,
    inventorytot:inventorytot,
    success_msg:'Inventory Quantity Updated Successfully',
    currentPage: currentPage,
    totalPages: Math.ceil(inventorytot.length / itemsPerPage),
    user:req.user,})
}else{
  res.render('admincurrentinventorylist',{shoplist:shoplist,inventory:inventory,warelist:warelist,
    inventorytot:inventorytot,
    error_msg:'Inventory Cant Update New Quantity Try Again',
    currentPage: currentPage,
    totalPages: Math.ceil(inventorytot.length / itemsPerPage),
    user:req.user,})
}
}else{
  res.render('admincurrentinventorylist',{shoplist:shoplist,inventory:inventory,warelist:warelist,
    inventorytot:inventorytot,
    error_msg:'Inventory Not Find',
    currentPage: currentPage,
    totalPages: Math.ceil(inventorytot.length / itemsPerPage),
    user:req.user,})
}

});
router.post('/updateinventoryqtyother',ensureAuthenticated,async (req,res) =>{
  const {newqty,invid} = req.body;
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
where MedicineInfos.producttag ='Other'
group by medicinename,medicinecategoryname,genericname,location_name,medicineid,warehouseid
  `);
const [inventory,mlm] = await db.sequelize.query(`
SELECT Inventories.invid,warehouseid,
manufuctureddate,expirydate,productcode,batchno,quantity,medicineid,medicinename,medicinecategoryname,genericname,suppliertype,
COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM Inventories
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid
LEFT JOIN Shops ON Shops.shopid = Inventories.warehouseid
LEFT JOIN Warehouses ON Warehouses.invid = Inventories.warehouseid
where  MedicineInfos.producttag ='Other'
`);
const itemsPerPage = 20; // Number of items per page
const currentPage = req.query.page ? parseInt(req.query.page) : 0;

// Calculate the slice of joblist to display for the current page
const startIndex = currentPage * itemsPerPage;
const endIndex = startIndex + itemsPerPage;
const inventorytotcurrent = inventorytot.slice(startIndex, endIndex);
const isinvthere = await db.Inventory.findOne({where:{invid:invid}});

if(isinvthere){
const udtqty = await db.Inventory.update({quantity:parseFloat(newqty)},{where:{invid:invid}});
if(udtqty){
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
where MedicineInfos.producttag ='Other'
group by medicinename,medicinecategoryname,genericname,location_name,medicineid,warehouseid
  `);
const [inventory,mlm] = await db.sequelize.query(`
SELECT Inventories.invid,warehouseid,
manufuctureddate,expirydate,productcode,batchno,quantity,medicineid,medicinename,medicinecategoryname,genericname,suppliertype,
COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM Inventories
INNER JOIN MedicineInfos ON medid = medicineid
INNER JOIN MedicineCategories ON MedicineInfos.medicinecategory = categoryid
INNER JOIN MedicineGenericNames ON MedicineInfos.medicinegenericname = drugid
LEFT JOIN Shops ON Shops.shopid = Inventories.warehouseid
LEFT JOIN Warehouses ON Warehouses.invid = Inventories.warehouseid
where  MedicineInfos.producttag ='Other'
`);
  res.render('otherproductinventorylist',{shoplist:shoplist,inventory:inventory,warelist:warelist,
    inventorytot:inventorytot,
    success_msg:'Inventory Quantity Updated Successfully',
    currentPage: currentPage,
    totalPages: Math.ceil(inventorytot.length / itemsPerPage),
    user:req.user,})
}else{
  res.render('otherproductinventorylist',{shoplist:shoplist,inventory:inventory,warelist:warelist,
    inventorytot:inventorytot,
    error_msg:'Inventory Cant Update New Quantity Try Again',
    currentPage: currentPage,
    totalPages: Math.ceil(inventorytot.length / itemsPerPage),
    user:req.user,})
}
}else{
  res.render('otherproductinventorylist',{shoplist:shoplist,inventory:inventory,warelist:warelist,
    inventorytot:inventorytot,
    error_msg:'Inventory Not Find',
    currentPage: currentPage,
    totalPages: Math.ceil(inventorytot.length / itemsPerPage),
    user:req.user,})
}

});
module.exports = router;