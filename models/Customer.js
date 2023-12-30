module.exports = (sequelize, DataTypes) => {

    const Customer = sequelize.define("Customer", {
      cusid: {
        type: DataTypes.STRING,
     
      },
      customername: {
        type: DataTypes.STRING,
     
      },
      customerphone: {
        type: DataTypes.STRING,
     
      },
      customeraddress: {
        type: DataTypes.STRING,
     
      },
  
})
    return Customer;
};


