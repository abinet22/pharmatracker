module.exports = (sequelize, DataTypes) => {

    const Purchase = sequelize.define("Purchase", {
      invid: {
        type: DataTypes.STRING,
     
      },
      medicineid: {
        type: DataTypes.STRING,
     
      },
  storedin: {
    type: DataTypes.STRING,
 
  },
supplierid: {
type: DataTypes.STRING,

},
batchno: {
type: DataTypes.STRING,

},

expirydate : {
type: DataTypes.DATE,

},
manufuctureddate: {
type: DataTypes.DATE,

},
productcode: {
type: DataTypes.STRING,

},
packagetype: {
type: DataTypes.STRING,

},
sellprice: {
type: DataTypes.DECIMAL(10,2),

},
costprice: {
type: DataTypes.DECIMAL(10,2),

},
quantity:{
type: DataTypes.DECIMAL(10,2),
},
totalcost: {
type: DataTypes.DECIMAL(10,2),

},
paymenttype: {
    type: DataTypes.STRING,
    
    },
    creditamount: {
        type: DataTypes.DECIMAL(10,2),
        
        },
        iscreditpayed: {
            type: DataTypes.STRING,
            
            },
    

  
})
    return Purchase;
};


