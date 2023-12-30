  module.exports = (sequelize, DataTypes) => {

    const SalesData = sequelize.define("SalesData", {
      saleid: {
        type: DataTypes.STRING,
     
      },
      customername: {
        type: DataTypes.STRING,
     
      },
      customerphone: {
        type: DataTypes.STRING,
     
      },
      customertin: {
        type: DataTypes.STRING,
     
      },
      soldby:{
        type: DataTypes.STRING,
     
      },
      medicineid: {
        type: DataTypes.STRING,
     
      },
      unitprice: {
        type: DataTypes.DECIMAL(10,2),
     
      },
      transactiontype:{
        type: DataTypes.STRING,
      },
      discountamount: {
        type: DataTypes.DECIMAL(10,2),
     
      },
      totalpayable: {
        type: DataTypes.DECIMAL(10,2),
     
      },
      paid: {
        type: DataTypes.DECIMAL(10,2),
     
      },
      shopid: {
        type: DataTypes.STRING,
     
      },
      quantity: {
        type: DataTypes.DECIMAL(10,2),
     
      },
})
    return SalesData;
};


