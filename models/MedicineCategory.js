module.exports = (sequelize, DataTypes) => {

    const MedicineCategory = sequelize.define("MedicineCategory", {
        categoryid: {
        type: DataTypes.STRING,
     
      },
      medicinecategoryname: {
        type: DataTypes.STRING,
     
      },
      producttag: {
        type: DataTypes.STRING,
     
      },
  
})
    return MedicineCategory;
};


