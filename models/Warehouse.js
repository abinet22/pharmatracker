module.exports = (sequelize, DataTypes) => {

    const Warehouse = sequelize.define("Warehouse", {
        invid: {
        type: DataTypes.STRING,
     
      },
      inventoryaddress: {
    type: DataTypes.STRING,
 
  },

  inventoryname: {
    type: DataTypes.STRING,
  
   },
   ismain: {
    type: DataTypes.STRING 
  },
  inventorymanager: {
    type: DataTypes.STRING
  },
  contactphone:{
    type: DataTypes.STRING
  },
  
  isactive: {
    type: DataTypes.STRING
  }
  
})
    return Warehouse;
};


