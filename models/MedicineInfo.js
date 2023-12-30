module.exports = (sequelize, DataTypes) => {

    const MedicineInfo = sequelize.define("MedicineInfo", {
      medid: {
        type: DataTypes.STRING,
     
      },
      medicinename: {
        type: DataTypes.STRING,
     
      },
      medicinecategory: {
        type: DataTypes.STRING,
     
      },
      medicinemanufucturer: {
        type: DataTypes.STRING,
     
      },
      medicinegenericname: {
        type: DataTypes.STRING,
     
      },
      producttag: {
        type: DataTypes.STRING,
     
      },
      suppliertype: {
        type: DataTypes.STRING,
     
      },
})
    return MedicineInfo;
};


