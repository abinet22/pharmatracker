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
const e = require('connect-flash');


router.get('/addotherproduct', ensureAuthenticated, async(req, res) => {
 
  const supplierlist = await db.MedicineSupplier.findAll({});
  const medicinecategorylist = await db.MedicineCategory.findAll({where:{ producttag:'Other'}});
  const medicinegenericinamelist = await db.MedicineGenericName.findAll({where:{ producttag:'Other'}});
  const manufucturerlist = await db.MedicineManufucturer.findAll({where:{ producttag:'Other'}});
 
  const [medicinelist,mlm] = await db.sequelize.query(`
  select * from MedicineInfos 
  inner join MedicineCategories on categoryid = medicinecategory 
  inner join MedicineGenericNames on drugid = medicinegenericname 
  where MedicineInfos.producttag='Other'
  `)
 
  
  res.render('addotherproduct',{manufucturerlist:manufucturerlist,
    supplierlist:supplierlist,
    medicinelist:medicinelist,
    user:req.user,
    medicinegenericinamelist:medicinegenericinamelist,
    medicinecategorylist:medicinecategorylist})
 
});
 
router.post('/addnewproduct', ensureAuthenticated, async(req, res) => {
  const {medicinename,medicinecategory,medicinegenericname} = req.body;

  let errors =[];
  const medicinecategorylist = await db.MedicineCategory.findAll({where:{ producttag:'Other'}});
  const medicinegenericinamelist = await db.MedicineGenericName.findAll({where:{ producttag:'Other'}});
  const manufucturerlist = await db.MedicineManufucturer.findAll({where:{ producttag:'Other'}});
  
  const supplierlist = await db.MedicineSupplier.findAll({});
  const [medicinelist,mlm] = await db.sequelize.query(`
  select * from MedicineInfos 
  inner join MedicineCategories on categoryid = medicinecategory 
  inner join MedicineGenericNames on drugid = medicinegenericname 
  where MedicineInfos.producttag='Other'
  `)
  console.log(req.body)
  if(!medicinecategory ||!medicinegenericname  ||!medicinename){
  errors.push({msg:'Please enter all required feilds'})
  }
  if(medicinecategory ==="0" ||medicinegenericname==="0" ||medicinename==="0" ){
    errors.push({msg:'Please select all required feilds'})
    }
  if(errors.length >0){
    res.render('addotherproduct',{manufucturerlist:manufucturerlist,
      supplierlist:supplierlist,
      user:req.user,
      medicinelist:medicinelist,errors,
      medicinegenericinamelist:medicinegenericinamelist,
      medicinecategorylist:medicinecategorylist})
  }
  else{
     var manufuctureid = uuidv4();
     var categoryid = uuidv4();
     var drugid = uuidv4();
    if (medicinename === "addNew") {
      // Handle adding a new medicine manufacturer here
      const newManufacturerName = req.body.newManufacturerName; // Assuming you have an input field for the new name
      if (newManufacturerName) {
        // Save the new manufacturer to the database
        const newManufacturerData = {
          manufuctureid: manufuctureid,
          manufucturername: newManufacturerName,
          producttag:'Other'
          // ... (other fields if any)
        };
        const maninfo = await db.MedicineManufucturer.findOne({where:{manufucturername: newManufacturerName}});
        if(maninfo){
          res.render('addotherproduct',{manufucturerlist:manufucturerlist,
            supplierlist:supplierlist,
            user:req.user,error_msg:'Product name already registered',
            medicinelist:medicinelist,errors,
            medicinegenericinamelist:medicinegenericinamelist,
            medicinecategorylist:medicinecategorylist})
        }else{
          await db.MedicineManufucturer.create(newManufacturerData);
        }
      }
    }
    if (medicinecategory === "addNew") {
      // Handle adding a new medicine manufacturer here
      const newmedicinecategoryName = req.body.newmedicinecategoryName; // Assuming you have an input field for the new name
      if (newmedicinecategoryName) {
        // Save the new manufacturer to the database
        const newmedicinecategoryNameData = {
          categoryid:categoryid,
          medicinecategoryname: newmedicinecategoryName,
          producttag:'Other'
          // ... (other fields if any)
        };
        const medcat = await db.MedicineCategory.findOne({where:{medicinecategoryname: newmedicinecategoryName}});
        if(medcat){
          res.render('addotherproduct',{manufucturerlist:manufucturerlist,
            supplierlist:supplierlist,
            user:req.user,error_msg:'Product Sub category already registered',
            medicinelist:medicinelist,errors,
            medicinegenericinamelist:medicinegenericinamelist,
            medicinecategorylist:medicinecategorylist})
        }else{
          await db.MedicineCategory.create(newmedicinecategoryNameData);
        }
      }
    }
    if (medicinegenericname === "addNew") {
      // Handle adding a new medicine manufacturer here
      const newmedicinegenericName = req.body.newmedicinegenericName; // Assuming you have an input field for the new name
      if (newmedicinegenericName) {
        // Save the new manufacturer to the database
        const newmedicinegenericNameData = {
          drugid: drugid,
          genericname: newmedicinegenericName,
          producttag:'Other'
          // ... (other fields if any)
        };
        const medgen = await db.MedicineGenericName.findOne({where:{ genericname: newmedicinegenericName}});
        if(medgen){
          res.render('addotherproduct',{manufucturerlist:manufucturerlist,
            supplierlist:supplierlist,
            user:req.user,error_msg:'Product Main Category already registered',
            medicinelist:medicinelist,errors,
            medicinegenericinamelist:medicinegenericinamelist,
            medicinecategorylist:medicinecategorylist})
        }else{
          await db.MedicineGenericName.create(newmedicinegenericNameData);
        }
      }
    }

    if(medicinename === "addNew" || medicinecategory === "addNew" || medicinegenericname === "addNew"){
      const medicinenameis = await db.MedicineManufucturer.findOne({where:{manufucturername:req.body.newManufacturerName}});
      if (!medicinenameis) {
        return res.render('addotherproduct',{manufucturerlist:manufucturerlist,
            supplierlist:supplierlist,
            medicinelist:medicinelist,
            user:req.user,
            error_msg:'Product name with this category cant find',
            medicinegenericinamelist:medicinegenericinamelist,
            medicinecategorylist:medicinecategorylist})
        
      }
        const medData ={
            medid:uuidv4(),
            medicinecategory:medicinecategory==="addNew"?categoryid:medicinecategory,
            medicinegenericname:medicinegenericname==="addNew"?drugid:medicinegenericname,
            medicinemanufucturer:medicinename==="addNew"?manufuctureid:medicinename,
            medicinename:medicinename==="addNew"?req.body.newManufacturerName:medicinenameis.manufucturername,
            producttag:'Other'
        }
     console.log(medData)
      const medinfo =  await db.MedicineInfo.findOne({where:{
        medicinecategory:medicinecategory==="addNew"?categoryid:medicinecategory,
        medicinegenericname:medicinegenericname==="addNew"?drugid:medicinegenericname,
        medicinemanufucturer:medicinename==="addNew"?manufuctureid:medicinename,
        medicinename:medicinename==="addNew"?req.body.newManufacturerName:medicinenameis.manufucturername,
       
        }});
  
          if(medinfo){
            res.render('addotherproduct',{manufucturerlist:manufucturerlist,
              supplierlist:supplierlist,
              medicinelist:medicinelist,
              user:req.user,
              error_msg:'Product name with this category already registered',
              medicinegenericinamelist:medicinegenericinamelist,
              medicinecategorylist:medicinecategorylist})
          }else{
     const newinvdata = await db.MedicineInfo.create(medData);
        if(newinvdata){
          const [medicinelistData,mdm] = await db.sequelize.query(`
          SELECT * FROM MedicineInfos 
          INNER JOIN MedicineCategories ON medicinecategory = categoryid 
          INNER JOIN MedicineGenericNames ON medicinegenericname = drugid
          where MedicineInfos.producttag='Other'
        `);

        res.render('addotherproduct',{manufucturerlist:manufucturerlist,
          supplierlist:supplierlist,
          medicinelist:medicinelistData,
          user:req.user,
          success_msg:'Successfully registered new product info',
          medicinegenericinamelist:medicinegenericinamelist,
          medicinecategorylist:medicinecategorylist})
         }else{
          res.render('addotherproduct',{manufucturerlist:manufucturerlist,
            supplierlist:supplierlist,
            medicinelist:medicinelist,
            user:req.user,
            error_msg:'Error while creating new product info',
            medicinegenericinamelist:medicinegenericinamelist,
            medicinecategorylist:medicinecategorylist})
         }
          }
    }else{
      const medicinenameis = await db.MedicineManufucturer.findOne({where:{manufuctureid:medicinename}});
      if (!medicinenameis) {
        return res.render('addotherproduct',{manufucturerlist:manufucturerlist,
            supplierlist:supplierlist,
            medicinelist:medicinelist,
            user:req.user,
            error_msg:'Product name with this category cant find',
            medicinegenericinamelist:medicinegenericinamelist,
            medicinecategorylist:medicinecategorylist})
        
      }
        const medData ={
            medid:uuidv4(),
            medicinecategory:medicinecategory,
            medicinegenericname:medicinegenericname,
            medicinemanufucturer:medicinename,
            medicinename:medicinenameis.manufucturername,
            producttag:'Other'
        }
  
      const medinfo =  await db.MedicineInfo.findOne({where:{medicinecategory:medicinecategory,
          medicinegenericname:medicinegenericname,
          medicinemanufucturer:medicinename,
          medicinename:medicinenameis.manufucturername,}});
  
          if(medinfo){
            res.render('addotherproduct',{manufucturerlist:manufucturerlist,
              supplierlist:supplierlist,
              medicinelist:medicinelist,
              user:req.user,
              error_msg:'Product name with this category already registered',
              medicinegenericinamelist:medicinegenericinamelist,
              medicinecategorylist:medicinecategorylist})
          }else{
     const newinvdata = await db.MedicineInfo.create(medData);
        if(newinvdata){
          const [medicinelistData,mdm] = await db.sequelize.query(`
          SELECT * FROM MedicineInfos 
          INNER JOIN MedicineCategories ON medicinecategory = categoryid 
          INNER JOIN MedicineGenericNames ON medicinegenericname = drugid
          where MedicineInfos.producttag='Other'
        `);
        res.render('addotherproduct',{manufucturerlist:manufucturerlist,
          supplierlist:supplierlist,
          medicinelist:medicinelistData,
          user:req.user,
          success_msg:'Successfully registered new product info',
          medicinegenericinamelist:medicinegenericinamelist,
          medicinecategorylist:medicinecategorylist})
         }else{
          res.render('addotherproduct',{manufucturerlist:manufucturerlist,
            supplierlist:supplierlist,
            medicinelist:medicinelist,
            user:req.user,
            error_msg:'Error while creating new product info',
            medicinegenericinamelist:medicinegenericinamelist,
            medicinecategorylist:medicinecategorylist})
         }
          }
    }
   

  }

 
}); 


router.get('/deletemanufucturer/:manufuctureid', ensureAuthenticated, async (req, res) => {
  const manufucturerlist = await db.MedicineManufucturer.findAll({});
  
  db.MedicineManufucturer.findOne({ where: { manufuctureid: req.params.manufuctureid } })
    .then(medcat => {
      if (medcat) {
        db.MedicineManufucturer.destroy({ where: { manufuctureid: req.params.manufuctureid } })
          .then(dltmedcat => {
            db.MedicineManufucturer.findAll({})
              .then(newmedcat => {
                res.render('addmedicinemanufucturer', {
                  user: req.user,
                  manufucturerlist: newmedcat,
                  success_msg: 'Successfully deleted manufacturer',
                });
              })
              .catch(err => {
                res.render('addmedicinemanufucturer', {
                  user: req.user,
                  manufucturerlist: manufucturerlist,
                  error_msg: 'Error while fetching new manufacturers',
                });
              });
          })
          .catch(err => {
            res.render('addmedicinemanufucturer', {
              user: req.user,
              manufucturerlist: manufucturerlist,
              error_msg: 'Error while deleting manufacturer',
            });
          });
      } else {
        res.render('addmedicinemanufucturer', {
          user: req.user,
          manufucturerlist: manufucturerlist,
          error_msg: 'Manufacturer not found',
        });
      }
    })
    .catch(err => {
      res.render('addmedicinemanufucturer', {
        user: req.user,
        manufucturerlist: manufucturerlist,
        error_msg: 'Error while finding manufacturer',
      });
    });
});

router.get('/deletemedicinegenericname/(:drugid)', ensureAuthenticated, async (req, res) => {
  const medicinegenericinamelist  = await db.MedicineGenericName.findAll({});
  db.MedicineGenericName.findOne({where:{drugid:req.params.drugid}}).then(medcat =>{
    if(medcat){
        db.MedicineGenericName.destroy({where:{drugid:req.params.drugid}}).then(dltmedcat =>{
         db.MedicineGenericName.findAll({}).then(newmedcat =>{
          res.render('addmedicinegenericname',{ success_msg:'Successfully delete medicine generic name',user:req.user,medicinegenericinamelist:newmedcat})

         }).catch(err =>{
          res.render('addmedicinegenericname',{ error_msg:'Error while finding updated medicine generic name',user:req.user,medicinegenericinamelist:medicinegenericinamelist})

         })
        }).catch(err =>{
          res.render('addmedicinegenericname',{error_msg:'Error while deleting medicine  generic name', user:req.user,medicinegenericinamelist:medicinegenericinamelist})

       })
    }else{
      res.render('addmedicinegenericname',{ error_msg:'Error while finding medicine  generic name',user:req.user,medicinegenericinamelist:medicinegenericinamelist})

    }
   }).catch(err =>{
    res.render('addmedicinegenericname',{error_msg:'Error while finding medicine  generic name', user:req.user,medicinegenericinamelist:medicinegenericinamelist})

    })
});
router.get('/deletemedicinecategory/(:categoryid)', ensureAuthenticated, async (req, res) => {
  const medicinecategorylist  = await db.MedicineCategory.findAll({});

  db.MedicineCategory.findOne({where:{categoryid:req.params.categoryid}}).then(medcat =>{
   if(medcat){
       db.MedicineCategory.destroy({where:{categoryid:req.params.categoryid}}).then(dltmedcat =>{
        db.MedicineCategory.findAll({}).then(newmedcat =>{
          res.render('addmedicinecategory',{success_msg:'Successfully delete medicine category', user:req.user,medicinecategorylist:newmedcat})

        }).catch(err =>{
          res.render('addmedicinecategory',{error_msg:'Error while finding updated medicine category', user:req.user,medicinecategorylist:medicinecategorylist})
 
        })
       }).catch(err =>{
        res.render('addmedicinecategory',{error_msg:'Error while deleting medicine category', user:req.user,medicinecategorylist:medicinecategorylist})

      })
   }else{
    res.render('addmedicinecategory',{error_msg:'Error while finding medicine category', user:req.user,medicinecategorylist:medicinecategorylist})

   }
  }).catch(err =>{
    res.render('addmedicinecategory',{error_msg:'Error while finding medicine category', user:req.user,medicinecategorylist:medicinecategorylist})
  })

});
router.get('/deleteproduct/:medid', ensureAuthenticated, async (req, res) => {
  let medicinelist = []; // Initialize medicinelist
  const [medicinecategorylist, medicinegenericinamelist, supplierlist, manufucturerlist] = await Promise.all([
    db.MedicineCategory.findAll({where:{ producttag:'Other'}}),
    db.MedicineGenericName.findAll({where:{ producttag:'Other'}}),
    db.MedicineSupplier.findAll({}),
    db.MedicineManufucturer.findAll({where:{ producttag:'Other'}}),
  ]);
  try {
   

    await db.MedicineInfo.destroy({ where: { medid: req.params.medid } });

    const [medicinelistData, mdlism] = await db.sequelize.query(`
    SELECT * FROM MedicineInfos 
    INNER JOIN MedicineCategories ON medicinecategory = categoryid 
    INNER JOIN MedicineGenericNames ON medicinegenericname = drugid
    where MedicineInfos.producttag='Other'
    `);

    medicinelist = medicinelistData; // Update medicinelist
   console.log(medicinelist)
   console.log(medicinelistData)
    res.render('addotherproduct', {
      manufucturerlist,
      supplierlist,
      medicinelist,
      user: req.user,
      success_msg: 'Successfully delete product info data',
      medicinegenericinamelist,
      medicinecategorylist,
    });
  } catch (error) {
    console.error(error);
    res.render('addotherproduct', {
      manufucturerlist,
      supplierlist,
      medicinelist,
      user: req.user,
      error_msg: 'Error while deleting product info data',
      medicinegenericinamelist,
      medicinecategorylist,
    });
  }
});


module.exports = router;