module.exports = (sequelize, DataTypes) => {

    const Shop = sequelize.define("Shop", {
      shopid: {
        type: DataTypes.STRING,
     
      },
  shopname: {
    type: DataTypes.STRING,
 
  },
  shopmanager: {
    type: DataTypes.STRING,
 
  },
  contactphone: {
    type: DataTypes.STRING,
 
  },

  shopaddress: {
    type: DataTypes.STRING,
  
   },

  is_active: {
    type: DataTypes.STRING
  }
  
})
    return Shop;
};


