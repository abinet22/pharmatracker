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

router.get('/addmedicinesupplier', ensureAuthenticated, async(req, res) => {
    db.MedicineSupplier.findAll({}).then( supplierlist =>{
      res.render('addmedicinesupplier',{ user:req.user,supplierlist:supplierlist})
    }).catch(err =>{
      res.render('addmedicinesupplier',{ user:req.user,supplierlist:''})
    })
   
});
router.get('/addmedicinemanufucturer', ensureAuthenticated, async(req, res) => {
  db.MedicineManufucturer.findAll({}).then( manufucturerlist =>{
    res.render('addmedicinemanufucturer',{ user:req.user,manufucturerlist:manufucturerlist})
  }).catch(err =>{
    res.render('addmedicinemanufucturer',{ user:req.user,manufucturerlist:''})
  })
 
});
router.get('/addmedicinegenericname', ensureAuthenticated, async(req, res) => {
  db.MedicineGenericName.findAll({}).then( medicinegenericinamelist =>{
    res.render('addmedicinegenericname',{ user:req.user,medicinegenericinamelist:medicinegenericinamelist})
  }).catch(err =>{
    res.render('addmedicinegenericname',{ user:req.user,medicinegenericinamelist:''})
  })
 
});
router.get('/addmedicinecategory', ensureAuthenticated, async(req, res) => {
  db.MedicineCategory.findAll({}).then( medicinecategorylist =>{
    res.render('addmedicinecategory',{ user:req.user,medicinecategorylist:medicinecategorylist})
  }).catch(err =>{
    res.render('addmedicinecategory',{ user:req.user,medicinecategorylist:''})
  })
 
});
router.get('/addmedicine', ensureAuthenticated, async(req, res) => {
  const medicinecategorylist = await db.MedicineCategory.findAll({});
  const medicinegenericinamelist = await db.MedicineGenericName.findAll({});
  const supplierlist = await db.MedicineSupplier.findAll({});
  const manufucturerlist = await db.MedicineManufucturer.findAll({});
  const [medicinelist,mlm] = await db.sequelize.query(`
  select * from MedicineInfos 
  inner join MedicineCategories on categoryid = medicinecategory 
  inner join MedicineGenericNames on drugid = medicinegenericname 
  `)
 
  
  res.render('addmedicine',{manufucturerlist:manufucturerlist,
    supplierlist:supplierlist,
    medicinelist:medicinelist,
    user:req.user,
    medicinegenericinamelist:medicinegenericinamelist,
    medicinecategorylist:medicinecategorylist})
 
});
router.post('/addnewmedicinesupplier', ensureAuthenticated, async(req, res) => {
    const {suppliername,supplierphone,supplieraddress,suppliertype} = req.body;

    let errors =[];
    const supplierlist  = await db.MedicineSupplier.findAll({});
    if(!supplieraddress ||!suppliername ||!supplierphone ||!suppliertype){
    errors.push({msg:'Please enter all required feilds'})
    }
    if(errors.length >0){
        res.render('addmedicinesupplier',{ user:req.user,supplierlist:supplierlist,errors})
    }
    else{
        const supplierData ={
            supplierid:uuidv4(),
            supplieraddress:supplieraddress,
            suppliername:suppliername,
            suppliertype:suppliertype,
            supplierphonenumber:supplierphone,
            user:req.user,
        }

        db.MedicineSupplier.findOne({where:{suppliername:suppliername}}).then(inv =>{
          if(inv){
            res.render('addmedicinesupplier',{ user:req.user,supplierlist:supplierlist,error_msg:'Error supplier name already registered'})
   
          }else{
        db.MedicineSupplier.create(supplierData).then(newinvdata =>{
         if(newinvdata){
          db.MedicineSupplier.findAll({}).then(udtinv =>{
            res.render('addmedicinesupplier',{ user:req.user,supplierlist:udtinv,success_msg:'Successfully create new supplier'})
  
          }).catch(err =>{
            console.log(err)
            res.render('addmedicinesupplier',{ user:req.user,supplierlist:supplierlist,error_msg:'Error while finding new supplier'})
        })
         }else{
            res.render('addmedicinesupplier',{ user:req.user,supplierlist:udtinv,success_msg:'Successfully create new supplier'})
  
         }
        }).catch(err =>{
            console.log(err)
            res.render('addmedicinesupplier',{ user:req.user,supplierlist:supplierlist,error_msg:'Error while creating supplier'})
        })
          }
        }).catch(err =>{
            console.log(err)
           res.render('addmedicinesupplier',{ user:req.user,supplierlist:supplierlist,error_msg:'Error while finding supplier'})
        })

    }
 
   
}); 
router.post('/addnewmedicinemanufucturer', ensureAuthenticated, async(req, res) => {
  const {manufucturername} = req.body;

  let errors =[];
  const manufucturerlist  = await db.MedicineManufucturer.findAll({});
  if(!manufucturername){
  errors.push({msg:'Please enter all required feilds'})
  }
  if(errors.length >0){
      res.render('addmedicinemanufucturer',{ user:req.user,manufucturerlist:manufucturerlist,errors})
  }
  else{
      const manData ={
        manufuctureid:uuidv4(),
          manufucturername:manufucturername,
         
          
      }

      db.MedicineManufucturer.findOne({where:{manufucturername:manufucturername}}).then(inv =>{
        if(inv){
          res.render('addmedicinemanufucturer',{ user:req.user,manufucturerlist:manufucturerlist,error_msg:'Error manufucturer name already registered'})
 
        }else{
      db.MedicineManufucturer.create(manData).then(newinvdata =>{
       if(newinvdata){
        db.MedicineManufucturer.findAll({}).then(udtinv =>{
          res.render('addmedicinemanufucturer',{ user:req.user,manufucturerlist:udtinv,success_msg:'Successfully create new manufucturer'})

        }).catch(err =>{
          console.log(err)
          res.render('addmedicinemanufucturer',{ user:req.user,manufucturerlist:manufucturerlist,error_msg:'Error while finding new manufucturer'})
      })
       }else{
          res.render('addmedicinemanufucturer',{ user:req.user,manufucturerlist:udtinv,success_msg:'Successfully create new manufucturer'})

       }
      }).catch(err =>{
          console.log(err)
          res.render('addmedicinemanufucturer',{ user:req.user,manufucturerlist:manufucturerlist,error_msg:'Error while creating manufucturer'})
      })
        }
      }).catch(err =>{
          console.log(err)
         res.render('addmedicinemanufucturer',{ user:req.user,manufucturerlist:manufucturerlist,error_msg:'Error while finding manufucturer'})
      })

  }

 
}); 
router.post('/addnewmedicinegenericname', ensureAuthenticated, async(req, res) => {
  const {genericname,description} = req.body;

  let errors =[];
  const medicinegenericinamelist  = await db.MedicineGenericName.findAll({});
  if(!genericname ||!description){
  errors.push({msg:'Please enter all required feilds'})
  }
  if(errors.length >0){
      res.render('addmedicinegenericname',{ user:req.user,medicinegenericinamelist:medicinegenericinamelist,errors})
  }
  else{
      const medgenData ={
        drugid:uuidv4(),
          genericname:genericname,
          description:description
      }

      db.MedicineGenericName.findOne({where:{genericname:genericname}}).then(inv =>{
        if(inv){
          res.render('addmedicinegenericname',{ user:req.user,medicinegenericinamelist:medicinegenericinamelist,error_msg:'Error medicine generic name already registered'})
 
        }else{
      db.MedicineGenericName.create(medgenData).then(newinvdata =>{
       if(newinvdata){
        db.MedicineGenericName.findAll({}).then(udtinv =>{
          res.render('addmedicinegenericname',{ user:req.user,medicinegenericinamelist:udtinv,success_msg:'Successfully create new medicine generic name'})

        }).catch(err =>{
          console.log(err)
          res.render('addmedicinegenericname',{ user:req.user,medicinegenericinamelist:medicinegenericinamelist,error_msg:'Error while finding new medicine generic name'})
      })
       }else{
          res.render('addmedicinegenericname',{ user:req.user,medicinegenericinamelist:udtinv,success_msg:'Successfully create new medicine generic name'})

       }
      }).catch(err =>{
          console.log(err)
          res.render('addmedicinegenericname',{ user:req.user,medicinegenericinamelist:medicinegenericinamelist,error_msg:'Error while creating medicine generic name'})
      })
        }
      }).catch(err =>{
          console.log(err)
         res.render('addmedicinegenericname',{ user:req.user,medicinegenericinamelist:medicinegenericinamelist,error_msg:'Error while finding medicine generic name'})
      })

  }

 
});
router.post('/addnewmedicinecategory', ensureAuthenticated, async(req, res) => {
  const {medicinecategoryname} = req.body;

  let errors =[];
  const medicinecategorylist  = await db.MedicineCategory.findAll({});
  if(!medicinecategoryname){
  errors.push({msg:'Please enter all required feilds'})
  }
  if(errors.length >0){
      res.render('addmedicinecategory',{ user:req.user,medicinecategorylist:medicinecategorylist,errors})
  }
  else{
      const medcatData ={
        categoryid:uuidv4(),
        medicinecategoryname:medicinecategoryname,
         
          
      }

      db.MedicineCategory.findOne({where:{medicinecategoryname:medicinecategoryname}}).then(inv =>{
        if(inv){
          res.render('addmedicinecategory',{ user:req.user,medicinecategorylist:medicinecategorylist,error_msg:'Error medicine category name already registered'})
 
        }else{
      db.MedicineCategory.create(medcatData).then(newinvdata =>{
       if(newinvdata){
        db.MedicineCategory.findAll({}).then(udtinv =>{
          res.render('addmedicinecategory',{ user:req.user,medicinecategorylist:udtinv,success_msg:'Successfully create new  medicine category'})

        }).catch(err =>{
          console.log(err)
          res.render('addmedicinecategory',{ user:req.user,medicinecategorylist:medicinecategorylist,error_msg:'Error while finding new  medicine category'})
      })
       }else{
          res.render('addmedicinecategory',{ user:req.user,medicinecategorylist:udtinv,success_msg:'Successfully create new  medicine category'})

       }
      }).catch(err =>{
          console.log(err)
          res.render('addmedicinecategory',{ user:req.user,medicinecategorylist:medicinecategorylist,error_msg:'Error while creating  medicine category'})
      })
        }
      }).catch(err =>{
          console.log(err)
         res.render('addmedicinecategory',{medicinecategorylist:medicinecategorylist,error_msg:'Error while finding  medicine category'})
      })

  }

 
});  
router.post('/addnewmedicine', ensureAuthenticated, async(req, res) => {
  const {medicinename,medicinecategory,medicinegenericname,suppliertype} = req.body;

  let errors =[];
  const medicinecategorylist = await db.MedicineCategory.findAll({});
  const medicinegenericinamelist = await db.MedicineGenericName.findAll({});
  const manufucturerlist = await db.MedicineManufucturer.findAll({});
  
  const supplierlist = await db.MedicineSupplier.findAll({});
  const [medicinelist,mlm] = await db.sequelize.query(`
  select * from MedicineInfos 
  inner join MedicineCategories on categoryid = medicinecategory 
  inner join MedicineGenericNames on drugid = medicinegenericname 
  `)
  console.log(req.body)
  if(!medicinecategory ||!medicinegenericname  ||!medicinename){
  errors.push({msg:'Please enter all required feilds'})
  }
  if(medicinecategory ==="0" ||medicinegenericname==="0" ||medicinename==="0" ||suppliertype==="0" ){
    errors.push({msg:'Please select all required feilds'})
    }
  if(errors.length >0){
    res.render('addmedicine',{manufucturerlist:manufucturerlist,
      supplierlist:supplierlist,
      user:req.user,errors,
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
          producttag:'Medicine'
        };
        const maninfo = await db.MedicineManufucturer.findOne({where:{manufucturername: newManufacturerName}});
        if(maninfo){
          res.render('addmedicine',{manufucturerlist:manufucturerlist,
            supplierlist:supplierlist,
            user:req.user,error_msg:'Medicine name already registered',
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
          producttag:'Medicine'
        };
        
        const medcat = await db.MedicineCategory.findOne({where:{medicinecategoryname: newmedicinecategoryName}});
        if(medcat){
          res.render('addmedicine',{manufucturerlist:manufucturerlist,
            supplierlist:supplierlist,
            user:req.user,error_msg:'Medicine category already registered',
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
          producttag:'Medicine'
        };
       
        const medgen = await db.MedicineGenericName.findOne({where:{ genericname: newmedicinegenericName}});
        if(medgen){
          res.render('addmedicine',{manufucturerlist:manufucturerlist,
            supplierlist:supplierlist,
            user:req.user,error_msg:'Medicine generic name already registered',
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
        return res.render('addmedicine',{manufucturerlist:manufucturerlist,
            supplierlist:supplierlist,
            medicinelist:medicinelist,
            user:req.user,
            error_msg:'Medicine name with this manufucturer cant find',
            medicinegenericinamelist:medicinegenericinamelist,
            medicinecategorylist:medicinecategorylist})
        
      }
        const medData ={
            medid:uuidv4(),
            medicinecategory:medicinecategory==="addNew"?categoryid:medicinecategory,
            medicinegenericname:medicinegenericname==="addNew"?drugid:medicinegenericname,
            medicinemanufucturer:medicinename==="addNew"?manufuctureid:medicinename,
            medicinename:medicinename==="addNew"?req.body.newManufacturerName:medicinenameis.manufucturername,
            suppliertype:suppliertype,
            producttag:'Medicine'
        }
     console.log(medData)
      const medinfo =  await db.MedicineInfo.findOne({where:{
        medicinecategory:medicinecategory==="addNew"?categoryid:medicinecategory,
        medicinegenericname:medicinegenericname==="addNew"?drugid:medicinegenericname,
        medicinemanufucturer:medicinename==="addNew"?manufuctureid:medicinename,
        medicinename:medicinename==="addNew"?req.body.newManufacturerName:medicinenameis.manufucturername,
       
        }});
  
          if(medinfo){
            res.render('addmedicine',{manufucturerlist:manufucturerlist,
              supplierlist:supplierlist,
              medicinelist:medicinelist,
              user:req.user,
              error_msg:'Medicine name with this manufucturer already registered',
              medicinegenericinamelist:medicinegenericinamelist,
              medicinecategorylist:medicinecategorylist})
          }else{
     const newinvdata = await db.MedicineInfo.create(medData);
        if(newinvdata){
          const [medicinelistData,mdm] = await db.sequelize.query(`
          SELECT * FROM MedicineInfos 
          INNER JOIN MedicineCategories ON medicinecategory = categoryid 
          INNER JOIN MedicineGenericNames ON medicinegenericname = drugid
        `);

        res.render('addmedicine',{manufucturerlist:manufucturerlist,
          supplierlist:supplierlist,
          medicinelist:medicinelistData,
          user:req.user,
          success_msg:'Successfully registered new medicine info',
          medicinegenericinamelist:medicinegenericinamelist,
          medicinecategorylist:medicinecategorylist})
         }else{
          res.render('addmedicine',{manufucturerlist:manufucturerlist,
            supplierlist:supplierlist,
            medicinelist:medicinelist,
            user:req.user,
            error_msg:'Error while creating new medicine info',
            medicinegenericinamelist:medicinegenericinamelist,
            medicinecategorylist:medicinecategorylist})
         }
          }
    }else{
      const medicinenameis = await db.MedicineManufucturer.findOne({where:{manufuctureid:medicinename}});
      if (!medicinenameis) {
        return res.render('addmedicine',{manufucturerlist:manufucturerlist,
            supplierlist:supplierlist,
            medicinelist:medicinelist,
            user:req.user,
            error_msg:'Medicine name with this manufucturer cant find',
            medicinegenericinamelist:medicinegenericinamelist,
            medicinecategorylist:medicinecategorylist})
        
      }
        const medData ={
            medid:uuidv4(),
            medicinecategory:medicinecategory,
            medicinegenericname:medicinegenericname,
            medicinemanufucturer:medicinename,
            medicinename:medicinenameis.manufucturername,
            suppliertype:suppliertype,
            producttag:'Medicine'
        }
  
      const medinfo =  await db.MedicineInfo.findOne({where:{medicinecategory:medicinecategory,
          medicinegenericname:medicinegenericname,
          medicinemanufucturer:medicinename,
          medicinename:medicinenameis.manufucturername,}});
  
          if(medinfo){
            res.render('addmedicine',{manufucturerlist:manufucturerlist,
              supplierlist:supplierlist,
              medicinelist:medicinelist,
              user:req.user,
              error_msg:'Medicine name with this manufucturer already registered',
              medicinegenericinamelist:medicinegenericinamelist,
              medicinecategorylist:medicinecategorylist})
          }else{
            const cat = await db.MedicineCategory.findAll({});
            const gen = await db.MedicineGenericName.findAll({});
            const man = await db.MedicineManufucturer.findAll({});
            
     const newinvdata = await db.MedicineInfo.create(medData);
        if(newinvdata){
          const [medicinelistData,mdm] = await db.sequelize.query(`
          SELECT * FROM MedicineInfos 
          INNER JOIN MedicineCategories ON medicinecategory = categoryid 
          INNER JOIN MedicineGenericNames ON medicinegenericname = drugid
        `);
        res.render('addmedicine',{manufucturerlist:man,
          supplierlist:supplierlist,
          medicinelist:medicinelistData,
          user:req.user,
          success_msg:'Successfully registered new medicine info',
          medicinegenericinamelist:gen,
          medicinecategorylist:cat})
         }else{
          res.render('addmedicine',{manufucturerlist:manufucturerlist,
            supplierlist:supplierlist,
            medicinelist:medicinelist,
            user:req.user,
            error_msg:'Error while creating new medicine info',
            medicinegenericinamelist:medicinegenericinamelist,
            medicinecategorylist:medicinecategorylist})
         }
          }
    }
   

  }

 
}); 
router.get('/deletesupplier/:supplierid', ensureAuthenticated, async (req, res) => {
  const supplierlist = await db.MedicineSupplier.findAll({});
 
  db.MedicineSupplier.findOne({ where: { supplierid: req.params.supplierid } })
    .then(medcat => {
      if (medcat) {
        db.MedicineSupplier.destroy({ where: { supplierid: req.params.supplierid } })
          .then(dltmedcat => {
            db.MedicineSupplier.findAll({})
              .then(newmedcat => {
                res.render('addmedicinesupplier', {
                  user: req.user,
                  supplierlist: newmedcat,
                  success_msg: 'Supplier deleted successfully',
                });
              })
              .catch(err => {
                res.render('addmedicinesupplier', {
                  user: req.user,
                  supplierlist: supplierlist,
                  error_msg: 'Error while fetching new suppliers',
                });
              });
          })
          .catch(err => {
            res.render('addmedicinesupplier', {
              user: req.user,
              supplierlist: supplierlist,
              error_msg: 'Error while deleting supplier',
            });
          });
      } else {
        res.render('addmedicinesupplier', {
          user: req.user,
          supplierlist: supplierlist,
          error_msg: 'Supplier not found',
        });
      }
    })
    .catch(err => {
      res.render('addmedicinesupplier', {
        user: req.user,
        supplierlist: supplierlist,
        error_msg: 'Error while finding supplier',
      });
    });
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
router.get('/deletemedicine/:medid', ensureAuthenticated, async (req, res) => {
  let medicinelist = []; // Initialize medicinelist

  try {
    const [medicinecategorylist, medicinegenericinamelist, supplierlist, manufucturerlist] = await Promise.all([
      db.MedicineCategory.findAll({}),
      db.MedicineGenericName.findAll({}),
      db.MedicineSupplier.findAll({}),
      db.MedicineManufucturer.findAll({}),
    ]);

    await db.MedicineInfo.destroy({ where: { medid: req.params.medid } });

    const [medicinelistData, mdlism] = await db.sequelize.query(`
    SELECT * FROM MedicineInfos 
    INNER JOIN MedicineCategories ON medicinecategory = categoryid 
    INNER JOIN MedicineGenericNames ON medicinegenericname = drugid
    `);

    medicinelist = medicinelistData; // Update medicinelist
   console.log(medicinelist)
   console.log(medicinelistData)
    res.render('addmedicine', {
      manufucturerlist,
      supplierlist,
      medicinelist,
      user: req.user,
      success_msg: 'Successfully delete medicine info data',
      medicinegenericinamelist,
      medicinecategorylist,
    });
  } catch (error) {
    console.error(error);
    res.render('addmedicine', {
      manufucturerlist,
      supplierlist,
      medicinelist,
      user: req.user,
      error_msg: 'Error while deleting medicine info data',
      medicinegenericinamelist,
      medicinecategorylist,
    });
  }
});
router.post('/updatemedicine/:medid', ensureAuthenticated, async (req, res) => {
  let medicinelist = []; // Initialize medicinelist
const {suppliertype} = req.body;
 

 try {
  const [medicinecategorylist, medicinegenericinamelist, supplierlist, manufucturerlist] = await Promise.all([
    db.MedicineCategory.findAll({}),
    db.MedicineGenericName.findAll({}),
    db.MedicineSupplier.findAll({}),
    db.MedicineManufucturer.findAll({}),
  ]);
  if(suppliertype ==="0"){
    res.render('addmedicine', {
      manufucturerlist,
      supplierlist,
      medicinelist,
      user: req.user,
      error_msg: 'Error please select drug type',
      medicinegenericinamelist,
      medicinecategorylist,
    });
   }else{
    await db.MedicineInfo.update({suppliertype:suppliertype},{ where: { medid: req.params.medid } });

    const [medicinelistData, mdlism] = await db.sequelize.query(`
    SELECT * FROM MedicineInfos 
    INNER JOIN MedicineCategories ON medicinecategory = categoryid 
    INNER JOIN MedicineGenericNames ON medicinegenericname = drugid
    `);
  
    medicinelist = medicinelistData; // Update medicinelist
   console.log(medicinelist)
   console.log(medicinelistData)
    res.render('addmedicine', {
      manufucturerlist,
      supplierlist,
      medicinelist,
      user: req.user,
      success_msg: 'Successfully update medicine info data',
      medicinegenericinamelist,
      medicinecategorylist,
    });
   }

} catch (error) {
  console.error(error);
  res.render('addmedicine', {
    manufucturerlist,
    supplierlist,
    medicinelist,
    user: req.user,
    error_msg: 'Error while updating medicine info data',
    medicinegenericinamelist,
    medicinecategorylist,
  });
}
});

module.exports = router;