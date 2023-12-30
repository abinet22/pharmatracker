module.exports = (sequelize, DataTypes) => {

    const MedicineGenericName = sequelize.define("MedicineGenericName", {
      drugid: {
        type: DataTypes.STRING,
     
      },
      genericname: {
        type: DataTypes.STRING,
     
      },
 
      description: {
        type: DataTypes.STRING,
     
      },
      producttag: {
        type: DataTypes.STRING,
     
      },
})
    return MedicineGenericName;
};


