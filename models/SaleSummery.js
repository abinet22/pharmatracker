
module.exports = (sequelize, DataTypes) => {

    const SaleSummery = sequelize.define("SaleSummery", {
      
      saleid: {
        type: DataTypes.STRING,
     
      },
              soldby: {
                type: DataTypes.STRING,
             
              },
              productinfo:{
                type: DataTypes.JSON,
             
              },
              totalamount: {
                type: DataTypes.DECIMAL(10,2),
             
              },
              paidamount: {
                type: DataTypes.DECIMAL(10,2),
             
              },
              creditamount: {
                type: DataTypes.DECIMAL(10,2),
             
              },
              shopid: {
                type: DataTypes.STRING,
             
              },
             
              customername: {
                type: DataTypes.STRING,
             
              },
              customerphone: {
                type: DataTypes.STRING,
             
              },
 
  
})
    return SaleSummery;
};


