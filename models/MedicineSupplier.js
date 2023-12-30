module.exports = (sequelize, DataTypes) => {

    const MedicineSupplier = sequelize.define("MedicineSupplier", {
      supplierid: {
        type: DataTypes.STRING,
     
      },
      suppliername: {
        type: DataTypes.STRING,
     
      },
      supplieremail: {
        type: DataTypes.STRING,
     
      },
      supplierphonenumber: {
        type: DataTypes.STRING,
     
      },
      supplieraddress: {
        type: DataTypes.STRING,
     
      },
      suppliertype: {
        type: DataTypes.STRING,
     
      },
 
  
})
    return MedicineSupplier;
};


