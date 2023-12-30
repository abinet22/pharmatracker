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
router.get('/addshop', ensureAuthenticated, async(req, res) => {
    const shoplist  = await db.Shop.findAll({});
    res.render('addshop',{ user:req.user,shoplist:shoplist})

}); 
router.post('/addnewshop', ensureAuthenticated, async(req, res) => {
    const {shopname,shopmanager,shopaddress,contactphone} = req.body;

    let errors =[];
    const shoplist  = await db.Shop.findAll({});
    if(!shopmanager ||!shopname ||!shopaddress ||!contactphone){
    errors.push({msg:'Please enter all required feilds'})
    }
    if(errors.length >0){
        res.render('addshop',{ user:req.user,shoplist:shoplist,errors})
    }
    else{
        const shopData ={
            shopid:uuidv4(),
            shopaddress:shopaddress,
            shopname:shopname,
            shopmanager:shopmanager,
            contactphone:contactphone,
            isactive:'Yes'
        }

        db.Shop.findOne({where:{shopname:shopname}}).then(shop =>{
          if(shop){
            res.render('addshop',{ user:req.user,shoplist:shoplist,error_msg:'Error shop name already registered'})
   
          }else{
        db.Shop.create(shopData).then(newinvdata =>{
         if(newinvdata){
          db.Shop.findAll({}).then(udtinv =>{
            res.render('addshop',{ user:req.user,shoplist:udtinv,success_msg:'Successfully create new shop'})
  
          }).catch(err =>{
            console.log(err)
            res.render('addshop',{ user:req.user,shoplist:shoplist,error_msg:'Error while finding new shop'})
        })
         }else{
            res.render('addshop',{ user:req.user,shoplist:shoplist,success_msg:'Successfully create new shop'})
  
         }
        }).catch(err =>{
            console.log(err)
            res.render('addshop',{ user:req.user,shoplist:shoplist,error_msg:'Error while creating shop'})
        })
          }
        }).catch(err =>{
            console.log(err)
           res.render('addshop',{ user:req.user,shoplist:shoplist,error_msg:'Error while finding shop'})
        })

    }
 
   
});
router.post('/deleteshop/(:shopid)', ensureAuthenticated, async (req, res) => {
    const shoplist  = await db.Shop.findAll({});
    res.render('addshop',{ user:req.user,shoplist:shoplist})
});
router.post('/editshop/(:shopid)', ensureAuthenticated, async (req, res) => {
    const shoplist  = await db.Shop.findAll({});
    res.render('addshop',{ user:req.user,shoplist:shoplist})
});
router.get('/addinventory', ensureAuthenticated, async(req, res) => {
    const inventorylist  = await db.Warehouse.findAll({});
    res.render('addinventory',{ user:req.user,inventorylist:inventorylist})
});
router.post('/addnewinventory', ensureAuthenticated, async(req, res) => {
    const {inventoryname,inventorymanager,inventoryaddress,contactphone} = req.body;

    let errors =[];
    const inventorylist  = await db.Warehouse.findAll({});
    if(!inventoryaddress ||!inventoryname ||!inventorymanager ||!contactphone){
    errors.push({msg:'Please enter all required feilds'})
    }
    if(errors.length >0){
        res.render('addinventory',{inventorylist:inventorylist,errors})
    }
    else{
        const inventoryData ={
            invid:uuidv4(),
            inventoryaddress:inventoryaddress,
            inventoryname:inventoryname,
            inventorymanager:inventorymanager,
            contactphone:contactphone,
            isactive:'Yes'
        }

        db.Warehouse.findOne({where:{inventoryname:inventoryname}}).then(inv =>{
          if(inv){
            res.render('addinventory',{inventorylist:inventorylist,error_msg:'Error warehouse name already registered'})
   
          }else{
        db.Warehouse.create(inventoryData).then(newinvdata =>{
         if(newinvdata){
          db.Warehouse.findAll({}).then(udtinv =>{
            res.render('addinventory',{inventorylist:udtinv,success_msg:'Successfully create new warehouse'})
  
          }).catch(err =>{
            console.log(err)
            res.render('addinventory',{inventorylist:inventorylist,error_msg:'Error while finding new warehouse'})
        })
         }else{
            res.render('addinventory',{inventorylist:udtinv,success_msg:'Successfully create new warehouse'})
  
         }
        }).catch(err =>{
            console.log(err)
            res.render('addinventory',{inventorylist:inventorylist,error_msg:'Error while creating warehouse'})
        })
          }
        }).catch(err =>{
            console.log(err)
           res.render('addinventory',{inventorylist:inventorylist,error_msg:'Error while finding warehouse'})
        })

    }
 
   
});
router.post('/deleteinventory/(:invid)', ensureAuthenticated, async (req, res) => {
    const inventorylist  = await db.Warehouse.findAll({});
    res.render('addinventory',{ user:req.user,inventorylist:inventorylist})
});
router.post('/editinventory/(:invid)', ensureAuthenticated, async (req, res) => {
    const inventorylist  = await db.Warehouse.findAll({});
    res.render('addinventory',{ user:req.user,inventorylist:inventorylist})
});

router.get('/addcustomer', ensureAuthenticated, async (req, res) => {
    const customerlist  = await db.Customer.findAll({});
    res.render('addcustomer',{ user:req.user,customerlist:customerlist})
});
router.get('/adduser', ensureAuthenticated, async(req, res) => {
  const [userlist,ulm]  = await db.sequelize.query(`
  SELECT 
  Users.*,
  COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM Users

LEFT JOIN Shops ON Shops.shopid = Users.shopwareid
LEFT JOIN Warehouses ON Warehouses.invid = Users.shopwareid

  `)
    const inventorylist  = await db.Warehouse.findAll({});
    const shoplist  = await db.Shop.findAll({});
   
    res.render('adduser',{ user:req.user,userlist:userlist,inventorylist:inventorylist,shoplist:shoplist});
})
router.post('/addnewuser', ensureAuthenticated, async (req, res) =>{
    const {password,username,fullname,repassword,phonenumber,userroll,wareid,shopid} =req.body;
    const [userlist,ulm]  = await db.sequelize.query(`
    SELECT 
    Users.*,
    COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM Users

LEFT JOIN Shops ON Shops.shopid = Users.shopwareid
LEFT JOIN Warehouses ON Warehouses.invid = Users.shopwareid

    `)
    const inventorylist  = await db.Warehouse.findAll({});
    const shoplist  = await db.Shop.findAll({});
     let errors =[];
     if(userroll === "0"){
       errors.push({msg:'Please select user roll'}) 
     }
     if(password != repassword){
       errors.push({msg:'Password and retype password must be the same'}) 
     }
     if(userroll === 'Sales_Manager' && !shopid){
       errors.push({msg:'Please select shop name'}) 
     }
     if(userroll === 'Sales_Manager' &&  shopid ==="0"){
       errors.push({msg:'Please select shop name'}) 
     }
     if(userroll === 'Inventory_Manager' && !wareid ){
       errors.push({msg:'Please select warehouse name'}) 
     }
     if(userroll === 'Inventory_Manager' &&  wareid ==="0"){
       errors.push({msg:'Please select warehouse name'}) 
     }
     if(!password |!repassword ||!username  ||!fullname ||!repassword ||!userroll ||!phonenumber){
       errors.push({msg:'Please enter all required fields'}) 
     }
     if(errors.length>0){
       res.render('adduser',{ user:req.user,userlist:userlist,errors,user:req.user,inventorylist:inventorylist,shoplist:shoplist});  
     }
     else{
       db.User.findOne({where:{username:username}}).then(emp =>{
         if(emp){
            res.render('adduser',{user:req.user,error_msg:'User name already used please change',userlist:userlist,inventorylist:inventorylist,shoplist:shoplist});  
       
          
        
            }else{
          
                const userData ={
                    staffid: uuidv4(),
                  fullname: fullname,
                  wareid:wareid,
                shopid:shopid,
                shopwareid:shopid==="0"?wareid:shopid,
                  phone_number: phonenumber,
                  username: username,
                  password:password,
                  user_roll: userroll,
                 
                  is_active: 'Yes'
                  }
                  bcrypt.hash(password, 10, (err, hash) => {
                    userData.password = hash;
                
                    db.User.create(userData).then(usernew =>{
                        if(usernew){
                           db.User.findAll({}).then(newuserlist =>{
                            res.render('adduser',{user:req.user,success_msg:'Successfully Created', userlist:newuserlist,inventorylist:inventorylist,shoplist:shoplist}); 
                       
                           }).catch(err =>{
                            res.render('adduser',{user:req.user,success_msg:'Successfully Created',userlist:userlist,inventorylist:inventorylist,shoplist:shoplist}); 
                       
                           })
                         
                        }
                          
                           else
                           {
                           res.render('adduser',{user:req.user,error_msg:'Error while creating users credentials',userlist:userlist,inventorylist:inventorylist,shoplist:shoplist});  }
                          }).catch(err =>{
                           console.log(err)
                           res.render('adduser',{user:req.user,error_msg:'Cant create user now please try again',userlist:userlist,inventorylist:inventorylist,shoplist:shoplist});
                           })
                    }); // 
         }
       }).catch(err =>{
         console.log(err)
         res.render('adduser',{user:req.user,error_msg:'Error while finding user data',userlist:userlist,inventorylist:inventorylist,shoplist:shoplist});  
       })
      
     }
});
router.post('/diactivateuser/(:staffid)', ensureAuthenticated, async(req, res) => {
  const [userlist,ulm]  = await db.sequelize.query(`
  SELECT 
  Users.*,
  COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM Users

LEFT JOIN Shops ON Shops.shopid = Users.shopwareid
LEFT JOIN Warehouses ON Warehouses.invid = Users.shopwareid

  `)
    const inventorylist  = await db.Warehouse.findAll({});
    const shoplist  = await db.Shop.findAll({});
   db.User.findOne({where:{staffid:req.user.staffid}}).then(user =>{
    if(user){
      db.User.update({is_active:'No'},{where:{staffid:req.user.staffid}}).then(udtusr =>{
          db.User.findAll({}).then(newusr =>{
            res.render('adduser',{ user:req.user,success_msg:'Successfully updated',userlist:newusr,inventorylist:inventorylist,shoplist:shoplist});
     
          }).catch(err =>{
            res.render('adduser',{ user:req.user,error_msg:'Cant find user with this ID',userlist:userlist,inventorylist:inventorylist,shoplist:shoplist});
     
          })
      }).catch(err =>{
        res.render('adduser',{ user:req.user,error_msg:'Cant update user with this ID',userlist:userlist,inventorylist:inventorylist,shoplist:shoplist});
 
      })
    }else{
        res.render('adduser',{ user:req.user,error_msg:'Cant find user with this ID',userlist:userlist,inventorylist:inventorylist,shoplist:shoplist});
 
    }
   }).catch(err =>{
    res.render('adduser',{ user:req.user,error_msg:'Cant find user with this ID',userlist:userlist,inventorylist:inventorylist,shoplist:shoplist});
   })
   
})
router.post('/activateuser/(:staffid)', ensureAuthenticated, async(req, res) => {
  const [userlist,ulm]  = await db.sequelize.query(`
  SELECT 
  Users.*,
  COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM Users

LEFT JOIN Shops ON Shops.shopid = Users.shopwareid
LEFT JOIN Warehouses ON Warehouses.invid = Users.shopwareid

  `)
    const inventorylist  = await db.Warehouse.findAll({});
    const shoplist  = await db.Shop.findAll({});
    db.User.findOne({where:{staffid:req.user.staffid}}).then(user =>{
        if(user){
          db.User.update({is_active:'Yes'},{where:{staffid:req.user.staffid}}).then(udtusr =>{
              db.User.findAll({}).then(newusr =>{
                res.render('adduser',{ user:req.user,success_msg:'Successfully updated',userlist:newusr,inventorylist:inventorylist,shoplist:shoplist});
         
              }).catch(err =>{
                res.render('adduser',{ user:req.user,error_msg:'Cant find user with this ID',userlist:userlist,inventorylist:inventorylist,shoplist:shoplist});
         
              })
          }).catch(err =>{
            res.render('adduser',{ user:req.user,error_msg:'Cant update user with this ID',userlist:userlist,inventorylist:inventorylist,shoplist:shoplist});
     
          })
        }else{
            res.render('adduser',{ user:req.user,error_msg:'Cant find user with this ID',userlist:userlist,inventorylist:inventorylist,shoplist:shoplist});
     
        }
       }).catch(err =>{
        res.render('adduser',{ user:req.user,error_msg:'Cant find user with this ID',userlist:userlist,inventorylist:inventorylist,shoplist:shoplist});
       })
       
})
router.post('/edituser/(:staffid)', ensureAuthenticated, async(req, res) => {
  const [userlist,ulm]  = await db.sequelize.query(`
  SELECT 
  Users.*,
  COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM Users

LEFT JOIN Shops ON Shops.shopid = Users.shopwareid
LEFT JOIN Warehouses ON Warehouses.invid = Users.shopwareid

  `)
    const inventorylist  = await db.Warehouse.findAll({});
    const shoplist  = await db.Shop.findAll({});
    db.User.findOne({where:{staffid:req.params.staffid}}).then(user =>{
        if(user){
          console.log(user)
          res.render('edituser',{staffid:req.params.staffid,editeduser:user,user:req.user,userlist:userlist,inventorylist:inventorylist,shoplist:shoplist});
         
        }else{
            res.render('edituser',{editeduser:'', staffid:req.params.staffid,user:req.user,userlist:userlist,inventorylist:inventorylist,shoplist:shoplist});
     
        }
       }).catch(err =>{
        console.log(err)
        res.render('edituser',{ editeduser:'', staffid:req.params.staffid,user:req.user,userlist:userlist,inventorylist:inventorylist,shoplist:shoplist});
       })
       
})
router.post('/updateuserinfo', ensureAuthenticated, async function (req, res) {
  const { staffid, password, username, fullname, phonenumber, userroll, wareid, shopid } = req.body;

  const [userlist,ulm]  = await db.sequelize.query(`
  SELECT 
  Users.*,
  COALESCE(Shops.shopname, Warehouses.inventoryname) AS location_name
FROM Users

LEFT JOIN Shops ON Shops.shopid = Users.shopwareid
LEFT JOIN Warehouses ON Warehouses.invid = Users.shopwareid

  `)
    const inventorylist  = await db.Warehouse.findAll({});
    const shoplist  = await db.Shop.findAll({});
  // Define the fields you want to update
  const updatedFields = {};

  // If the password is provided, hash it
  if (password) {
    bcrypt.hash(password, 10, (err, hash) => {
      if (!err) {
        updatedFields.password = hash;
      }
    });
  }

  // Populate the updated fields
  if (username) updatedFields.username = username;
  if (fullname) updatedFields.fullname = fullname;
  if (phonenumber) updatedFields.phone_number = phonenumber;
  if (userroll !=="0" && userroll) updatedFields.user_roll = userroll;
  if (wareid) updatedFields.wareid = wareid;
  if (shopid) updatedFields.wareid = shopid;

  // Only set shopwareid if shopid or wareid is provided
  if (shopid && shopid !== '0') {
    updatedFields.shopwareid = shopid;
  } else {
    updatedFields.shopwareid = wareid;
  }

  // Update the user in the database
  try {
   
    const updatedUser = await db.User.update(updatedFields, {
      where: { staffid: staffid },
    });

    if (updatedUser[0] === 1) {
      // User has been successfully updated
      res.render('edituser', {
        staffid: staffid,
        editeduser: '',
        success_msg:'Successfully Updated',
        user: req.user,
        userlist: userlist,
        inventorylist: inventorylist,
        shoplist: shoplist,
      });
    } else {
      // Handle the case where the user was not found
      res.render('edituser', {
        error_msg: 'User not found',
        editeduser: '',
        staffid: staffid,
        user: req.user,
        userlist: userlist,
        inventorylist: inventorylist,
        shoplist: shoplist,
      });
    }
  } catch (error) {
    console.error(error);
    res.render('edituser', {
      error_msg: 'Error while updating user',
      editeduser: '',
      staffid: staffid,
      user: req.user,
      userlist: userlist,
      inventorylist: inventorylist,
      shoplist: shoplist,
    });
  }
});

router.get('/addcustomer', ensureAuthenticated, async(req, res) => {
    const customerlist  = await db.Customer.findAll({});
    res.render('addcustomer',{ user:req.user,customerlist:customerlist})
});
router.post('/addnewcustomer', ensureAuthenticated, async(req, res) => {
  const {customername,customerphone,customeraddress} = req.body;

  let errors =[];
  const customerlist  = await db.Customer.findAll({});
  if(!customerphone ||!customername ||!customeraddress ){
  errors.push({msg:'Please enter all required feilds'})
  }
  if(errors.length >0){
      res.render('addcustomer',{ user:req.user,customerlist:customerlist,errors})
  }
  else{
      const customerData ={
          cusid:uuidv4(),
          customeraddress:customeraddress,
          customername:customername,
          customerphone:customerphone,
        
      }

      db.Customer.findOne({where:{customername:customername}}).then(inv =>{
        if(inv){
          res.render('addcustomer',{ user:req.user,customerlist:customerlist,error_msg:'Error customer name already registered'})
 
        }else{
      db.Customer.create(customerData).then(newinvdata =>{
       if(newinvdata){
        db.Warehouse.findAll({}).then(udtinv =>{
          res.render('addcustomer',{ user:req.user,customerlist:udtinv,success_msg:'Successfully create new customer info'})

        }).catch(err =>{
          console.log(err)
          res.render('addcustomer',{ user:req.user,customerlist:customerlist,error_msg:'Error while finding new customer'})
      })
       }else{
          res.render('addcustomer',{ user:req.user,customerlist:udtinv,success_msg:'Successfully create new customer'})

       }
      }).catch(err =>{
          console.log(err)
          res.render('addcustomer',{ user:req.user,customerlist:customerlist,error_msg:'Error while creating customer'})
      })
        }
      }).catch(err =>{
          console.log(err)
         res.render('addcustomer',{ user:req.user,customerlist:customerlist,error_msg:'Error while finding customer'})
      })

  }

 
});
module.exports = router;