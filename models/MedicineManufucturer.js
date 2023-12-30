
module.exports = (sequelize, DataTypes) => {

    const MedicineManufucturer = sequelize.define("MedicineManufucturer", {
      manufuctureid: {
        type: DataTypes.STRING,
     
      },
      manufucturername: {
        type: DataTypes.STRING,
     
      },
      producttag: {
        type: DataTypes.STRING,
     
      },
  
})
    return MedicineManufucturer;
};


